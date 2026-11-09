import type { Metadata } from "next";
import Link from "next/link";
import { Card, DocSection } from "@/components/docs/DocSection";
import { SiteHeader } from "@/components/SiteHeader";
import { db } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "The pitch · Night Shift",
  description: "Why Night Shift exists, who it is for, and the next 30 days.",
};

// The activity strip reads the database on every request.
export const dynamic = "force-dynamic";

async function loadActivity() {
  try {
    const supabase = db();
    // Real activity only: demo and test rows are flagged is_demo and never counted.
    const count = async (table: "projects" | "flares") => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("is_demo", false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const verified = await supabase
      .from("claims")
      .select("project_id", { count: "exact", head: true })
      .eq("verified", true);
    if (verified.error) throw new Error(verified.error.message);
    const [projects, flares] = await Promise.all([count("projects"), count("flares")]);
    return [
      { label: "Projects scouted", value: projects },
      { label: "Flares lit", value: flares },
      { label: "Verified founders", value: verified.count ?? 0 },
    ];
  } catch {
    return null;
  }
}

const AUDIENCE = [
  {
    who: "Scouts",
    body: "People who try new apps early and want credit for good taste. Every pick is signed, ranked at dawn and kept on a public record.",
  },
  {
    who: "Founders",
    body: "Builders who shipped something with AI tools and need a first signal. They claim the project and choose: raise, keep building or find testers.",
  },
  {
    who: "Backers and platforms",
    body: "People looking for what to fund next, and launchpads such as Vibestarter that need a pipeline of projects the community already backs.",
  },
];

const WHY_NOW = [
  "AI tools made shipping an app cheap and fast, so more get built than anyone can look at. Discovery is now the bottleneck, not building.",
  "Feeds reward volume and likes cost nothing. A scarce, signed vote says more than an endless one.",
  "Signing a message with a wallet on Base is free and needs no account, so every pick can be public and checkable without gas or sign-up.",
  "Crowdfunding for vibecoded apps already exists on Vibestarter, so a strong signal has somewhere to go.",
];

const MONEY = [
  {
    name: "Referral share on raises",
    body: "When a founder picks “Raise on Vibestarter” and goes on to raise, Night Shift earns a referral share from the platform. Scouts and founders pay nothing, and the incentive is to surface projects that really do raise.",
  },
  {
    name: "Sponsored Morning Report",
    body: "One clearly labelled sponsor slot in each Morning Report, for tools that builders use. The sponsor never touches the ranking, which stays flares only.",
  },
];

const SHIPPED = [
  "Signed flares with notes, 3 per wallet per night, enforced by the database",
  "Dawn lock, Morning Report and share images",
  "Founder claims and decisions; scout records with verifiable signatures",
  "A no-wallet demo edition with “Run dawn now”",
  "The AI analyst: strengths, risks and launch readiness",
];

const PLAN = [
  {
    when: "Days 1-7",
    items: [
      "Fix whatever judges and the first scouts hit",
      "Invite Vibeathon builders to claim their projects and scout each other",
    ],
  },
  {
    when: "Days 8-14",
    items: [
      "Tell founders when they are scouted or make the Morning Report",
      "A weekly digest of each week's top picks",
    ],
  },
  {
    when: "Days 15-21",
    items: [
      "Scout reputation as a ranking tiebreaker, from earlier nights' hits",
      "The board as a tower: each project a window that lights with flares",
    ],
  },
  {
    when: "Days 22-30",
    items: [
      "First steps on Sybil resistance, such as weighting flares by wallet history",
      "Talk to Vibestarter about a hand-off from “Raise” into a raise page",
      "Decide what to measure next from what the first month shows",
    ],
  },
];

export default async function PitchPage() {
  const activity = await loadActivity();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <section className="pt-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ the pitch</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Too many apps,
          <br />
          <span className="text-muted">not enough night.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Night Shift gives every scout 3 signed flares a night. At dawn the board locks, the Morning Report ranks
          what they backed, and founders decide what happens next.
        </p>
      </section>

      <DocSection label="problem" title="The problem">
        <p>
          Anyone can ship an app in a weekend now. Most of them vanish in a feed within a day, and the good ones are
          hard to tell apart from the rest. Likes are free, so they say little about what people actually believe in.
        </p>
        <p>
          Founders are left guessing whether to raise, keep building or go and find users. Backers are left
          scrolling.
        </p>
      </DocSection>

      <DocSection label="audience" title="Who it is for">
        <div className="grid gap-3 sm:grid-cols-3">
          {AUDIENCE.map((a) => (
            <Card key={a.who}>
              <p className="font-semibold text-ink">{a.who}</p>
              <p className="mt-2 text-sm">{a.body}</p>
            </Card>
          ))}
        </div>
      </DocSection>

      <DocSection label="why now" title="Why now">
        <ul className="list-disc space-y-2 pl-5">
          {WHY_NOW.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </DocSection>

      <DocSection label="activity" title="On the board so far">
        {activity && activity[0].value === 0 ? (
          <p className="text-sm">
            Night Shift launched during build week, and the first real nights start now. Nothing has been typed in
            or seeded to make it look busy.{" "}
            <Link href="/" className="text-signal hover:underline">
              Be one of the first scouts
            </Link>
            , or{" "}
            <Link href="/demo" className="text-signal hover:underline">
              try a full night in the demo
            </Link>
            .
          </p>
        ) : activity ? (
          <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {activity.map((s) => (
                <div key={s.label} className="rounded-2xl border border-line bg-panel p-4">
                  <dt className="font-mono text-xs uppercase tracking-widest text-muted">{s.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs">
              Read live from the database on every visit. Nothing here is typed in by hand, and demo data is left out.
              Night Shift launched during build week, so these numbers start small.
            </p>
          </>
        ) : (
          <p className="text-sm">Live activity isn&apos;t available right now.</p>
        )}
      </DocSection>

      <DocSection label="business" title="How it could make money">
        <div className="grid gap-3">
          {MONEY.map((m, i) => (
            <Card key={m.name}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-ink">
                  <span className="font-mono text-signal">0{i + 1}</span> {m.name}
                </p>
                <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
                  {i === 0 ? "first to try" : "later"}
                </span>
              </div>
              <p className="mt-2 text-sm">{m.body}</p>
            </Card>
          ))}
        </div>
        <p className="text-sm">
          Neither option exists yet, and no agreement with Vibestarter is in place. The referral share comes first
          because it only pays when a founder Night Shift surfaced actually raises, which keeps the incentive honest.
        </p>
      </DocSection>

      <DocSection label="next 30 days" title="The 30-day plan">
        <Card accent>
          <p className="font-mono text-xs uppercase tracking-widest text-signal">Already shipped in build week</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {SHIPPED.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <ol className="grid gap-3 sm:grid-cols-2">
          {PLAN.map((p) => (
            <li key={p.when} className="rounded-2xl border border-line bg-panel/60 p-4">
              <p className="font-mono text-xs uppercase tracking-widest text-signal">{p.when}</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                {p.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="text-sm">A plan, not a promise: the order will follow what the first scouts and founders need.</p>
      </DocSection>

      <div className="mt-12 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-night hover:opacity-90"
        >
          Scout tonight&apos;s board
        </Link>
        <Link
          href="/about"
          className="rounded-full border border-line px-5 py-2.5 text-sm text-muted hover:border-signal/50 hover:text-ink"
        >
          How it was built
        </Link>
      </div>
    </div>
  );
}
