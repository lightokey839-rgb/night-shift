# Night Shift

**Scouts back indie apps overnight. Founders decide at dawn.**

Night Shift is a community discovery board for vibecoded apps. Every wallet gets 3
**flares** a night to spend on projects it believes in. At 06:00 UTC the board locks and
the **Morning Report** ranks what the scouts backed and why. Founders claim their project
and choose what happens next: **Raise on Vibestarter**, **Keep building** or **Find testers**.

- Live: https://night-shift-nine-rho.vercel.app/
- Built for Vibeathon 02 by Vibestarter (theme: "Night shift")
- How it was built: [`/about`](https://night-shift-nine-rho.vercel.app/about) · The case for it: [`/pitch`](https://night-shift-nine-rho.vercel.app/pitch)

## Why

Thousands of small apps get shipped with AI tools every week, and most of them disappear
in a feed. Likes are free, so they say little. Night Shift makes attention scarce and
accountable: three signed picks per wallet per night, a hard deadline, and a public record
of who backed what before it was obvious. Founders get a clear signal from real wallets
and a short list of next moves, including a path to raise on Vibestarter.

## What works today

- **Scout.** Connect a browser wallet on Base, paste an indie app's https URL, pick what it
  was built with, and write why it deserves a shot (max 140 characters). You sign a
  plain-text message carrying the site's domain, a one-time nonce and a 10-minute expiry
  (no gas, no transaction). The server verifies it, rate-limits per wallet and IP, refuses
  big platforms, and fetches the page (https only, 5 s, 1 MB, private networks blocked on
  every redirect).
- **Overnight analyst.** Cheap site checks (loads, HTTPS, viewport, title, OG image, lang,
  alt text) plus one small-model call (Groq's free tier, or Claude Haiku) return a summary, up to 3 strengths and risks, and a
  launch-readiness score (0-100), cached per project. It runs on submission and again at
  dawn; on failure the UI says "analysis pending".
- **Flare.** Back projects on tonight's board with a signed note. 3 flares per wallet per
  night is a database constraint (unique slot 1-3). Flaring the same project twice is a no-op.
- **Demo edition** (`/demo`). No wallet needed: guests flare seeded demo apps, then
  "Run dawn now" locks the run and publishes its Morning Report in a few seconds. Demo data
  is flagged `is_demo`, badged "Demo", and never counted as real activity.
- **Tonight's board.** Ranked by flares, with a live countdown to dawn and a skyline where
  every flare lights a window. The sky warms as dawn approaches.
- **Dawn lock and Morning Report** (`/report`, `/report/[night]`). When a night closes, its
  board is frozen and Claude writes a headline, intro and one line per top-5 pick. If the AI
  fails, a template report is shown and not stored, so a real write-up replaces it later.
  A Vercel cron hits `/api/dawn` at 06:05 UTC; reports are also created on first visit.
- **Founder claims** (`/project/[id]`). A founder signs to start a claim, adds a
  `<meta name="night-shift-verify" content="ns-…">` tag to their site, and signs again to
  verify. A verified founder then signs a decision: raise, keep building or need testers.
  Pending claims are held for 24 hours before someone else can take over.
- **Scout records** (`/scout/[wallet]`). Every flare a wallet has lit, its final rank, and a
  hit rate (a hit is a top-3 finish at dawn, or a pick whose founder chose to raise).
  Any flare's signature can be re-checked against Base at `/api/flares/[id]/verify`.

## Architecture

```
Browser (wagmi, injected wallets)
   │  signs plain-text messages (personal_sign), no gas
   ▼
Next.js 15 App Router on Vercel
   ├─ Server components: /, /project/[id], /report/[night], /scout/[wallet]
   ├─ API routes
   │    POST /api/flare               scout or flare a project (signed, with a note)
   │    GET  /api/flares?wallet=      flares used tonight
   │    GET  /api/flares/[id]/verify  re-verify a stored signature
   │    POST /api/claim               claim → verify → decide
   │    GET  /api/dawn                cron + manual trigger: analyse top picks, publish (CRON_SECRET)
   │    POST /api/demo/flare          guest flare in the demo edition
   │    POST /api/demo/dawn           "Run dawn now" (30 s cooldown)
   │    POST /api/demo/analyze        owner: run the analyst on demo apps (CRON_SECRET)
   ├─ viem publicClient on Base       verifyMessage (EOA + ERC-1271/6492 smart wallets)
   ├─ src/lib/llm.ts                  Groq (GROQ_API_KEY) or Claude Haiku, JSON validated with zod
   └─ Supabase (service role, server only)
        projects · flares · claims · reports · pledges
```

**Nights.** A night is keyed by the UTC date of the dawn that closes it: `2026-11-07` is
the night that locks at 06:00 UTC on 7 Nov (`src/lib/night.ts`). "Locked" is not a stored
flag; a night is locked once it is earlier than the current night, so the API simply stops
accepting signatures for it.

**Signatures.** The client and server build the same message from shared code
(`src/lib/signing.ts`, with the action's fields from `flareFields` / `claimFields`). The
server rebuilds it from the request, checks domain and expiry, verifies it on Base, burns the
nonce in `used_nonces`, and stores the message and signature with the flare so anyone can
check it later.

**Database** (`supabase/schema.sql`, then `supabase/migrations/002_tracks_abc.sql`). Row level security is on with no public policies;
every read and write goes through server code using the service role key, which is
`server-only` and never reaches the browser.

| Table | Purpose |
| --- | --- |
| `projects` | One card per URL per night (`unique (url_key, night)`), with summary and tags |
| `flares` | Signed backing with a note; `unique (project_id, wallet)`, `unique (wallet, night, slot)` with slot 1-3 |
| `claims` | Founder wallet, verify code, verified flag, decision |
| `reports` | Stored Morning Reports (ranking JSON + write-up), first writer wins |
| `project_analysis` | Cached analyst output: checks, summary, strengths, risks, readiness |
| `used_nonces` | One row per signed message; replays hit the primary key |
| `demo_state` | The open demo run |
| `pledges` | Schema only. Not used by the app yet |

Demo rows (`is_demo = true`) live in the same tables and are filtered out of every real
board, report, counter and scout record. Guests are `guest:<id>` and can only flare demo rows
(a check constraint).

**Key files**

| Path | What it does |
| --- | --- |
| `src/lib/night.ts` | Dawn maths, night keys, flare fields |
| `src/lib/signing.ts` | Signed-message envelope: domain, nonce, expiry |
| `src/lib/submissions.ts` | https-only URL normalising, blocklist, built-with, notes |
| `src/lib/fetchPage.ts` | Public-page fetcher: private IPs blocked per redirect, 5 s, 1 MB, site checks |
| `src/lib/llm.ts` | One JSON call to Groq or Claude, with timeout and validation |
| `src/lib/analyst.ts` | Overnight analyst and its cache |
| `src/lib/report.ts` | Ranking, Morning Report write-up and storage, dawn job |
| `src/lib/demo.ts` | Demo runs, guest identity, "Run dawn now" rotation |
| `src/lib/scouts.ts` | Scout record and hit rate |
| `src/lib/verify.ts` | Signature, domain, expiry and nonce checks on Base; IP hashing |
| `src/lib/claims.ts` | Decisions, claim fields, verify snippet |

## Run it locally

Requirements: Node 20+, a free Supabase project, an Anthropic API key, and a browser wallet
(MetaMask, Rabby, Coinbase Wallet extension, …) to sign.

1. **Database.** In Supabase, open **SQL Editor → New query**, paste `supabase/schema.sql`
   and run it, then do the same with `supabase/migrations/002_tracks_abc.sql`. Note the
   project URL and the `service_role` key from **Project Settings → API**.
2. **Environment.** Copy `.env.example` to `.env.local` and fill it in (see below).
   `.env.local` is git-ignored. Never commit it and never paste these keys into a chat; if one
   leaks, rotate it straight away.
3. **Run.**

   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:3000.

4. **Test dawn without waiting.** Set `DEV_FAKE_NOW` to an ISO time (for example
   `2026-11-08T06:30:00Z`) in `.env.local` and restart the dev server. The server clock moves,
   so the previous night locks and its Morning Report can be generated. This only works when
   `NODE_ENV` is `development`.

5. **Seed the demo edition.** Fill `data/seed.json` with real vibecoded apps you have
   permission to feature (`url`, `title`, `built_with`, `note`), then run `npm run seed:demo`.
   With `SITE_URL` and `CRON_SECRET` set it also runs the analyst on them.
6. **Smoke test.** With `npm run dev` running, `npm run test:smoke` walks the whole loop
   (submit, validation, replay, limits, dawn, report, demo) on a 2030 test night using the
   dev-only clock at `/api/dev/clock`, then deletes what it created.

Before deploying, `npm run build` runs the type check and lint.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Project URL. A pasted `/rest/v1/` suffix is stripped |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Bypasses RLS, so keep it secret |
| `GROQ_API_KEY` | no* | Free-tier AI for the analyst and the Morning Report. Used first when set |
| `GROQ_MODEL` | no | Groq model id, default `openai/gpt-oss-20b` |
| `ANTHROPIC_API_KEY` | no* | Claude Haiku instead of Groq. *With neither key, the analyst shows site checks only and reports use the scouts' notes |
| `BASE_RPC_URL` | no | Base RPC for signature checks. Defaults to the public endpoint |
| `NEXT_PUBLIC_DAWN_HOUR_UTC` | no | Hour the board locks, default `6`. Keep the cron in `vercel.json` in step |
| `CRON_SECRET` | prod | Vercel sends it as `Authorization: Bearer …` to `/api/dawn`. Without it the route returns 401 |
| `NEXT_PUBLIC_VIBESTARTER_APPLY_URL` | no | Where "Raise on Vibestarter" links. Hidden when unset |
| `IP_HASH_SALT` | no | Salt for the hashed IPs used in rate limits |
| `DEV_FAKE_NOW` | no | Development only. ISO time that replaces the server clock |

## Deploy

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables above under **Settings → Environment Variables**,
   including `CRON_SECRET`.
3. Deploy. `vercel.json` registers a daily cron at `5 6 * * *` (06:05 UTC) for `/api/dawn`.

## Trade-offs

- **Wallet signatures, not accounts.** No sign-up and no gas, and every flare is publicly
  verifiable. The cost: one wallet is one scout, so a person with many wallets gets many
  flares. There is no Sybil resistance yet beyond the per-wallet cap.
- **Client-made nonces.** The browser picks the nonce and expiry; the server enforces the
  domain, a 10-minute window and single use. A server-issued nonce would need an extra round
  trip for the same protection.
- **Guests only in the demo.** The demo lets anyone try the full loop without a wallet, but
  guest flares are unsigned, so they are confined to demo data by a database constraint.
- **Locking by clock, not by a job.** The board locks because the night key moves on, so
  nothing has to run on time. The cron only pre-warms the AI write-up; a missed run delays
  it until the first visitor.
- **Ranking is flare count**, ties broken by who was scouted first. Simple and explainable,
  easy to game with many wallets.
- **AI is optional at every step.** Summaries fall back to page metadata; the report falls
  back to a template that is not stored. The AI never decides the ranking.
- **Server fetches untrusted URLs.** Guarded against private networks, redirects, large
  pages and slow hosts. Page text is passed to the model as data with explicit instructions
  not to follow it.
- **Service role key on the server** instead of RLS policies. Simpler for a one-week build;
  every route has to do its own checks.
- **Domain verification by meta tag.** Easy for anyone who can deploy their site; it proves
  control of the page, not of the wider brand.

## Next steps

- The tower board: each project a window, rain, the roof sign lighting at dawn.
- Scout reputation as a ranking tiebreaker (consensus hits from earlier nights).
- A read-only $VIBES balance badge on scout pages.
- Pledges (the table exists; no UI or API yet).
- Sybil resistance, for example weighting flares by wallet history or holdings.
- Notifications for founders when their project is scouted or makes the Morning Report.
- A direct hand-off from "Raise on Vibestarter" into a Vibestarter raise.

## Stack

Next.js 15.5.29 (App Router) · React 19 · Tailwind CSS 4 · Supabase Postgres ·
wagmi + viem on Base · Groq (free tier) or `@anthropic-ai/sdk` with `claude-haiku-5-5` · zod · Vercel (hosting + cron).

Built with Claude Code (Claude Opus 5.5) in the Claude desktop app. See `/about`.
