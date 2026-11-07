-- 002: demo edition, scout notes, built-with, signed-message nonces,
-- per-slot flare limit, AI analysis cache.
-- Run once in the Supabase SQL editor, after schema.sql. Safe to re-run.

-- Demo data is kept apart from real activity and never counted.
alter table projects add column if not exists is_demo boolean not null default false;
alter table projects add column if not exists built_with text;
alter table projects add column if not exists scout_ip_hash text;
alter table projects drop constraint if exists projects_built_with_check;
alter table projects add constraint projects_built_with_check check (
  built_with is null or built_with in ('lovable', 'bolt', 'replit', 'v0', 'cursor', 'claude-code', 'codex', 'other')
);

alter table flares add column if not exists is_demo boolean not null default false;
alter table flares add column if not exists note text;
alter table flares add column if not exists ip_hash text;
alter table flares add column if not exists slot smallint;
alter table flares drop constraint if exists flares_note_length;
alter table flares add constraint flares_note_length check (note is null or char_length(note) <= 140);
-- Guests (no wallet) can only flare in the demo edition.
alter table flares drop constraint if exists flares_guest_demo_only;
alter table flares add constraint flares_guest_demo_only check (wallet not like 'guest:%' or is_demo);

alter table reports add column if not exists is_demo boolean not null default false;

-- 3 flares per wallet per night as a hard constraint: each flare takes slot
-- 1, 2 or 3, and (wallet, night, slot) is unique, so concurrent inserts can't
-- both take the last slot.
with numbered as (
  select id, row_number() over (partition by wallet, night order by created_at) as n from flares
)
update flares f set slot = numbered.n from numbered where f.id = numbered.id and f.slot is null;

alter table flares drop constraint if exists flares_slot_range;
alter table flares add constraint flares_slot_range check (slot between 1 and 3);
create unique index if not exists flares_wallet_night_slot on flares (wallet, night, slot);

create or replace function enforce_flare_limit() returns trigger as $$
declare used integer;
begin
  select count(*) into used from flares where wallet = new.wallet and night = new.night;
  if used >= 3 then
    raise exception 'flare_limit';
  end if;
  new.slot := used + 1;
  return new;
end;
$$ language plpgsql;

-- Each signed message carries a nonce that can be used once.
create table if not exists used_nonces (
  nonce text primary key,
  wallet text not null,
  created_at timestamptz not null default now()
);

-- Overnight AI analyst results, one row per project.
create table if not exists project_analysis (
  project_id uuid primary key references projects (id) on delete cascade,
  status text not null check (status in ('ready', 'pending', 'failed')),
  checks jsonb not null default '{}',
  summary text,
  strengths text[] not null default '{}',
  risks text[] not null default '{}',
  readiness integer check (readiness between 0 and 100),
  updated_at timestamptz not null default now()
);

-- Which demo night is currently open. A single row.
create table if not exists demo_state (
  id integer primary key default 1 check (id = 1),
  night text not null,
  last_dawn_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table used_nonces enable row level security;
alter table project_analysis enable row level security;
alter table demo_state enable row level security;

-- The Base and ChatGPT rows were test scouts, not real activity: flag them.
update projects set is_demo = true
where url_key ~ '^(base\.org|chatgpt\.com|chat\.openai\.com|openai\.com)(/|$)';
update flares set is_demo = true
where project_id in (select id from projects where is_demo);
