-- Night Shift database schema.
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).
--
-- A "night" is identified by the UTC date of the dawn that closes it,
-- e.g. '2026-11-05' is the night that locks at 06:00 UTC on 5 Nov.
-- All access goes through the app's server routes with the service role key,
-- so row level security is on with no public policies.

create extension if not exists pgcrypto;

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  url_key text not null,
  title text not null,
  summary text not null,
  tags text[] not null default '{}',
  fundable_url text,
  scout_wallet text not null,
  night text not null,
  created_at timestamptz not null default now(),
  unique (url_key, night)
);

create index if not exists projects_night_idx on projects (night);

create table if not exists flares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  wallet text not null,
  night text not null,
  message text not null,
  signature text not null,
  created_at timestamptz not null default now(),
  unique (project_id, wallet)
);

create index if not exists flares_wallet_night_idx on flares (wallet, night);

-- Each wallet gets 3 flares per night, enforced in the database as well as the API.
create or replace function enforce_flare_limit() returns trigger as $$
begin
  if (select count(*) from flares where wallet = new.wallet and night = new.night) >= 3 then
    raise exception 'flare_limit';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists flares_limit on flares;
create trigger flares_limit before insert on flares
  for each row execute function enforce_flare_limit();

create table if not exists pledges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  wallet text not null,
  amount_usd integer not null check (amount_usd > 0 and amount_usd <= 100000),
  reason text,
  message text not null,
  signature text not null,
  created_at timestamptz not null default now(),
  unique (project_id, wallet)
);

create table if not exists reports (
  night text primary key,
  ranking jsonb not null,
  writeup text not null,
  created_at timestamptz not null default now()
);

create table if not exists claims (
  project_id uuid primary key references projects (id) on delete cascade,
  founder_wallet text not null,
  verify_code text not null,
  verified boolean not null default false,
  decision text check (decision in ('raise', 'keep_building', 'need_testers')),
  updated_at timestamptz not null default now()
);

alter table projects enable row level security;
alter table flares enable row level security;
alter table pledges enable row level security;
alter table reports enable row level security;
alter table claims enable row level security;
