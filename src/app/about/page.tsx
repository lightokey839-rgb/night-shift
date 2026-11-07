import type { Metadata } from "next";
import Link from "next/link";
import { Card, DocSection, OwnerTodo } from "@/components/docs/DocSection";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "How this was built · Night Shift",
  description: "The AI tools, the agent workflow and the real prompts behind Night Shift.",
};

const TOOLS = [
  {
    name: "Claude Code (Claude Opus 5.5)",
    role: "The builder. Run in the Claude desktop app, it planned each feature, wrote the code, ran it locally, tested it and shipped it through GitHub to Vercel.",
  },
  {
    name: "Claude Haiku 5.5 (in the product)",
    role: "Writes each project card's two-sentence summary and tags, and the Morning Report's headline and picks. Structured output with zod; the app falls back to templates if it fails.",
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
  { step: "Ship", body: "One small commit per feature, pushed to GitHub, deployed by Vercel." },
];

const PROMPTS = [
  {
    quote:
      "A community-powered discovery network where anyone can surface promising projects, supporters help them gain traction, and founders decide what happens next.",
    context: "The opening brief. Scouts, flares and founder decisions all grew from this sentence.",
  },
  {
    quote: "judge its against the past vibeathon edition and check which one wins",
    context: "The owner asked Claude to judge Night Shift against entries from the previous Vibeathon.",
  },
  {
    quote: "i feel like this cant win its just look like something anyone can build or look over",
    context: "The owner pushed back on a version that felt generic and asked for a stronger identity.",
  },
  {
    quote: "start the founder claims",
    context: "A one-line go-ahead. Claude then built the meta-tag verification and the three founder decisions.",
  },
];

// From `git log` on master. Commit times are in the owner's local time zone.
const TIMELINE = [
  { date: "4 Nov", what: "Empty create-next-app" },
  { date: "6 Nov", what: "Scouting end to end against Supabase · Next.js security upgrade · dawn lock and Morning Report · flares-left counter and how-it-works strip" },
  { date: "7 Nov", what: "Founder claims and decisions · scout records with verifiable signatures · the night skyline" },
];

const OWNER = [
  "The idea and the audience: a discovery network for vibecoded apps, run by the community",
  "Every go / no-go: each feature was proposed, then approved before it was built",
  "The bar: comparing against the last Vibeathon and asking for something less generic",
  "The order of work, such as when to start founder claims",
  "Accounts and secrets: Supabase, Anthropic, Vercel and the environment variables, set up by the owner",
];

const CLAUDE = [
  "Turning the brief into concrete mechanics (flares, the dawn lock, hit rates), proposed for approval",
  "All application code, the database schema and the UI copy",
  "Security work: signature checks on Base, SSRF guards on URL fetching, prompt-injection framing for page text",
  "Local testing with throwaway wallets, and fixes for what broke",
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
        <OwnerTodo>
          List any other AI tools you used (for design, copy, images or research), or confirm there were none.
        </OwnerTodo>
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
        <OwnerTodo>
          Check the one-line context under each prompt (especially what changed after the &ldquo;cant win&rdquo;
          message), and add one more prompt that shows a turning point, if you have one.
        </OwnerTodo>
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
        <OwnerTodo>
          Name any code, design or copy you wrote or changed by hand, and any moment you overruled Claude&apos;s
          suggestion. If none, say so.
        </OwnerTodo>
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
        <OwnerTodo>Add roughly how many hours you spent directing the build, and who you are (one line).</OwnerTodo>
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
