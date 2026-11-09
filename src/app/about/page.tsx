import type { Metadata } from "next";
import Link from "next/link";
import { Card, DocSection } from "@/components/docs/DocSection";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "How this was built · Night Shift",
  description: "The AI tools, the agent workflow and the real prompts behind Night Shift.",
};

const TOOLS = [
  {
    name: "Claude Code (Claude Opus 5.5, with Sonnet 5.5 for a few late tasks)",
    role: "The builder. Run in the Claude desktop app, it planned each feature, wrote the code, ran it locally, tested it and shipped it through GitHub to Vercel. For the final push, two Claude sessions worked in parallel: one on app features, one on these docs.",
  },
  {
    name: "A small model in the product (Groq free tier, or Claude Haiku)",
    role: "The overnight analyst (summary, tags, strengths, risks, launch readiness) and the Morning Report's headline and picks. JSON validated with zod; if it fails, the analyst shows site checks only and the report uses the scouts' own notes.",
  },
];

const LOOP = [
  { step: "Direct", body: "The owner set the goal or reacted to the last build in plain words." },
  { step: "Plan", body: "Claude read the code, proposed the change and the trade-offs, and waited for a go-ahead." },
  { step: "Build", body: "Claude wrote the code, the schema changes and the copy." },
  {
    step: "Test",
    body: "Claude ran the app locally, including scripted end-to-end checks that signed flares and claims with throwaway wallets, and ran the production build (type check and lint).",
  },
  { step: "Ship", body: "Commits pushed to GitHub on the owner's go-ahead, deployed by Vercel, then checked on the live site." },
];

const PROMPTS = [
  {
    quote:
      "A community-powered discovery network where anyone can surface promising projects, supporters help them gain traction, and founders decide what happens next.",
    context: "The opening brief. Scouts, flares and founder decisions all grew from this sentence.",
  },
  {
    quote: "judge its against the past vibeathon edition and check which one wins",
    context:
      "Claude compared it with Vibeathon 01's winners and found it weakest on launch potential. That led to wallet-signed flares on Base and positioning Night Shift as a pipeline into raising on Vibestarter.",
  },
  {
    quote: "i feel like this cant win its just look like something anyone can build or look over",
    context:
      "The turning point on identity: it led to the flares-left counter, the how-it-works strip, and the night skyline where every flare lights a window.",
  },
  {
    quote: "start the founder claims",
    context: "A one-line go-ahead. Claude then built the meta-tag verification and the three founder decisions.",
  },
  {
    quote: "Never show seeded or demo data as real activity.",
    context:
      "One rule from the owner's four-track brief for the final push. It is why demo rows are flagged, badged and kept out of every real count.",
  },
  {
    quote: "Im suggesting if the app tagline be backers instaed of scouters",
    context:
      "Claude kept “scouts” as the name (on Vibestarter, “backers” means people who fund raises) but took the verb: the tagline became “Scouts back indie apps overnight.”",
  },
];

// From `git log` on master. Commit times are in the owner's local time zone.
const TIMELINE = [
  { date: "4 Nov", what: "First commit: wallet sign-in on Base, signed flares and tonight's board" },
  { date: "6 Nov", what: "Scouting end to end against Supabase · first live deploy · Next.js security upgrade · dawn lock and Morning Report · flares-left counter and how-it-works strip" },
  { date: "7 Nov", what: "Founder claims and decisions · scout records with verifiable signatures · the night skyline · demo edition, scout notes, AI analyst and signed-message nonces · README, this page and the pitch · share images" },
  { date: "8 Nov", what: "In-app AI moved to Groq's free tier · smoke test extended to check the AI" },
];

const OWNER = [
  "The idea and the audience: a discovery network for vibecoded apps, run by the community",
  "Every go / no-go: each feature was proposed, then approved before it was built, and every push to the live site",
  "The bar: comparing against the last Vibeathon and asking for something less generic",
  "The four-track brief for the final push, and its honesty rule for demo data",
  "Product calls: the “back” in the tagline, a free AI provider (Groq) over paid credits, and seeding the demo with the owner's own apps",
  "Accounts and secrets: Supabase, Groq, Vercel and the environment variables, set up by the owner",
];

const CLAUDE = [
  "Turning the brief into concrete mechanics (flares, the dawn lock, hit rates), proposed for approval",
  "All application code, the database schema and the UI copy",
  "Security work: signature checks on Base, SSRF guards on URL fetching, prompt-injection framing for page text",
  "Local testing with throwaway wallets and an end-to-end smoke test, and fixes for what broke",
  "The cover image, drawn in code from the same skyline as the site",
  "Commits, pushes and deploys",
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <section className="pt-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ how this was built</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          One owner, one agent,
          <br />
          <span className="text-muted">one build week.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Night Shift was built for Vibeathon 02 from an empty Next.js project. The owner directed it in plain
          language; Claude Code wrote, tested and shipped the code. This page says who did what.
        </p>
      </section>

      <DocSection label="tools" title="The AI tools">
        <div className="grid gap-3">
          {TOOLS.map((t) => (
            <Card key={t.name}>
              <p className="font-semibold text-ink">{t.name}</p>
              <p className="mt-1 text-sm">{t.role}</p>
            </Card>
          ))}
        </div>
      </DocSection>

      <DocSection label="workflow" title="The agent loop">
        <ol className="grid gap-3 sm:grid-cols-5">
          {LOOP.map((l, i) => (
            <li key={l.step} className="rounded-2xl border border-line bg-panel/60 p-4">
              <p className="font-mono text-xs text-signal">
                {String(i + 1).padStart(2, "0")} · {l.step}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{l.body}</p>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection label="prompts" title="Real prompts from the build">
        <p>Quoted as typed, typos included.</p>
        <div className="grid gap-3">
          {PROMPTS.map((p) => (
            <Card key={p.quote}>
              <blockquote className="border-l-2 border-signal pl-3 font-mono text-sm text-ink">
                &ldquo;{p.quote}&rdquo;
              </blockquote>
              <p className="mt-3 text-sm">{p.context}</p>
            </Card>
          ))}
        </div>
      </DocSection>

      <DocSection label="split" title="Directed versus generated">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card accent>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">The owner directed</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {OWNER.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <p className="font-mono text-xs uppercase tracking-widest text-muted">Claude generated</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
              {CLAUDE.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="text-sm">
          No application code was written by hand. The owner edited configuration and data only: environment
          variables and the demo seed list. Where the owner overruled a suggestion, it is listed above as a product
          call.
        </p>
      </DocSection>

      <DocSection label="timeline" title="Commit by commit">
        <ol className="space-y-3">
          {TIMELINE.map((t) => (
            <li key={t.date} className="flex gap-4">
              <span className="w-14 shrink-0 font-mono text-sm text-signal">{t.date}</span>
              <span className="text-sm">{t.what}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm">
          Full history:{" "}
          <a
            href="https://github.com/lightokey839-rgb/night-shift/commits/master"
            className="text-signal hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            github.com/lightokey839-rgb/night-shift
          </a>
        </p>
        <p className="text-sm">
          Built by LIGHT, a Web3 developer and builder.{" "}
          <a
            href="https://light-portfolio-smoky.vercel.app"
            className="text-signal hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Portfolio
          </a>
        </p>
      </DocSection>

      <p className="mt-12 text-sm text-muted">
        Why it exists and where it goes next:{" "}
        <Link href="/pitch" className="text-signal hover:underline">
          read the pitch →
        </Link>
      </p>
    </div>
  );
}
