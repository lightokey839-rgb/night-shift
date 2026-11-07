# Night Shift

**Scouts find them overnight. Founders decide at dawn.**

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

## What works today (on `master`)

- **Scout.** Connect a browser wallet on Base and paste a project URL. You sign a
  plain-text message (no gas, no transaction). The server verifies the signature, fetches
  the page (with SSRF guards), and Claude Haiku writes a two-sentence summary and three tags.
  If the AI call fails, the card falls back to the page's own title and description.
- **Flare.** Back projects already on tonight's board. 3 flares per wallet per night,
  enforced by the API and by a Postgres trigger. One flare per wallet per project.
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
   │    POST /api/flare               scout or flare a project
   │    GET  /api/flares?wallet=      flares used tonight
   │    GET  /api/flares/[id]/verify  re-verify a stored signature
   │    POST /api/claim               claim → verify → decide
   │    GET  /api/dawn                cron: publish last night's report (CRON_SECRET)
   ├─ viem publicClient on Base       verifyMessage (EOA + ERC-1271/6492 smart wallets)
   ├─ @anthropic-ai/sdk               claude-haiku-5-5, structured output via zod
   └─ Supabase (service role, server only)
        projects · flares · claims · reports · pledges
```

**Nights.** A night is keyed by the UTC date of the dawn that closes it: `2026-11-07` is
the night that locks at 06:00 UTC on 7 Nov (`src/lib/night.ts`). "Locked" is not a stored
flag; a night is locked once it is earlier than the current night, so the API simply stops
accepting signatures for it.

**Signatures.** The client and server build the same message from shared code
(`flareMessage` in `src/lib/night.ts`, `claimMessage` in `src/lib/claims.ts`). The server
rebuilds it from the request, verifies it on Base, and stores the message and signature with
the flare so anyone can check it later.

**Database** (`supabase/schema.sql`). Row level security is on with no public policies;
every read and write goes through server code using the service role key, which is
`server-only` and never reaches the browser.

| Table | Purpose |
| --- | --- |
| `projects` | One card per URL per night (`unique (url_key, night)`), with summary and tags |
| `flares` | Signed backing; `unique (project_id, wallet)`, 3-per-night trigger |
| `claims` | Founder wallet, verify code, verified flag, decision |
| `reports` | Stored Morning Reports (ranking JSON + write-up), first writer wins |
| `pledges` | Schema only. Not used by the app yet |

**Key files**

| Path | What it does |
| --- | --- |
| `src/lib/night.ts` | Dawn maths, night keys, flare message, URL normalising |
| `src/lib/fetchPage.ts` | Public-page fetcher: blocks private IPs, re-checks each redirect, 512 KB cap, 8 s timeout |
| `src/lib/summarize.ts` | Project card summary with Claude Haiku |
| `src/lib/report.ts` | Ranking, Morning Report write-up and storage |
| `src/lib/scouts.ts` | Scout record and hit rate |
| `src/lib/verify.ts` | Signature verification on Base |
| `src/lib/claims.ts` | Decisions, claim messages, verify snippet |

## Run it locally

Requirements: Node 20+, a free Supabase project, an Anthropic API key, and a browser wallet
(MetaMask, Rabby, Coinbase Wallet extension, …) to sign.

1. **Database.** In Supabase, open **SQL Editor → New query**, paste `supabase/schema.sql`
   and run it. Note the project URL and the `service_role` key from **Project Settings → API**.
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

Before deploying, `npm run build` runs the type check and lint.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | yes | Project URL. A pasted `/rest/v1/` suffix is stripped |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Bypasses RLS, so keep it secret |
| `ANTHROPIC_API_KEY` | yes* | Summaries and the Morning Report. *Without it, both fall back to templates |
| `BASE_RPC_URL` | no | Base RPC for signature checks. Defaults to the public endpoint |
| `NEXT_PUBLIC_DAWN_HOUR_UTC` | no | Hour the board locks, default `6`. Keep the cron in `vercel.json` in step |
| `CRON_SECRET` | prod | Vercel sends it as `Authorization: Bearer …` to `/api/dawn`. Without it the route returns 401 |
| `DEV_FAKE_NOW` | no | Development only. ISO time that replaces the server clock |

`CRON_SECRET` and `DEV_FAKE_NOW` are not in `.env.example` yet; add them by hand.

## Deploy

1. Push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new).
2. Add the environment variables above under **Settings → Environment Variables**,
   including `CRON_SECRET`.
3. Deploy. `vercel.json` registers a daily cron at `5 6 * * *` (06:05 UTC) for `/api/dawn`.

## Trade-offs

- **Wallet signatures, not accounts.** No sign-up and no gas, and every flare is publicly
  verifiable. The cost: one wallet is one scout, so a person with many wallets gets many
  flares. There is no Sybil resistance yet beyond the per-wallet cap.
- **Signed messages have no nonce or expiry on `master`.** A flare message is bound to the
  project, night and wallet, and the database refuses duplicates, so replays can't add
  flares. Claim messages are bound to the action, project and wallet only.
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

In progress on a separate branch (not on `master` yet):

- A demo edition with guest flares and a "Run dawn now" button, so judges can try the full loop.
- Scout notes (140 characters) on each flare.
- A "built with" field on projects.
- Nonce, expiry and domain in signed messages.
- An AI analyst on each project: strengths, risks and a launch-readiness score (0-100).
- Open Graph images and a share button.

Later:

- Pledges (the table exists; no UI or API yet).
- Sybil resistance, for example weighting flares by wallet history or holdings.
- Notifications for founders when their project is scouted or makes the Morning Report.
- A direct hand-off from "Raise on Vibestarter" into a Vibestarter raise.

## Stack

Next.js 15.5.29 (App Router) · React 19 · Tailwind CSS 4 · Supabase Postgres ·
wagmi + viem on Base · `@anthropic-ai/sdk` with `claude-haiku-5-5` · zod · Vercel (hosting + cron).

Built with Claude Code (Claude Opus 5.5) in the Claude desktop app. See `/about`.
