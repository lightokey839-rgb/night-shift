# Night Shift

**Scouts find them overnight. Founders decide at dawn.**

A community discovery board for vibecoded apps. Every wallet gets 3 flares a night to
spend on projects it believes in. At dawn the board locks and the best finds go to the
Morning Report. Built for Vibeathon 02 (theme: Night shift).

## What works today

- Connect a wallet on Base (browser wallet or Coinbase Wallet).
- Scout a project by pasting its URL. You sign a message (no gas), the server checks the
  signature, fetches the page, and Claude Haiku writes a two-sentence summary and three tags.
- Flare projects already on tonight's board. 3 flares per wallet per night, enforced by the
  API and the database.
- Tonight's board, ranked by flares, with a live countdown to dawn.

Next up: pledges, the dawn lock and Morning Report, founder claims and decisions, scout records.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor -> New query**, paste the contents of `supabase/schema.sql`, and run it.
3. In **Project Settings -> API**, note the project URL and the `service_role` key.

### 2. Anthropic

Create an API key at [console.anthropic.com](https://console.anthropic.com).

### 3. Local environment

Copy `.env.example` to `.env.local` and fill in the values. Keep `.env.local` private: it is
git-ignored, and you should never paste these keys into a chat or commit them.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Deploy to Vercel

1. Push this folder to a new GitHub repository.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. Add the same environment variables from `.env.local` under **Settings -> Environment Variables**.
4. Deploy. That URL is your Vibeathon live link.

## Stack

Next.js 15 (App Router) · Tailwind CSS 4 · Supabase Postgres · wagmi + viem on Base ·
Claude Haiku 5.5 via `@anthropic-ai/sdk`.
