import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { DemoBadge, scoutLabel } from "@/components/BoardCard";
import { DecisionBadge } from "@/components/DecisionBadge";
import { ShareButton } from "@/components/ShareButton";
import { SiteHeader } from "@/components/SiteHeader";
import { Skyline } from "@/components/Skyline";
import type { AnalysisRow } from "@/lib/analyst";
import type { Decision } from "@/lib/claims";
import { currentDemoRun, isDemoRun } from "@/lib/demo";
import { shortAddress } from "@/lib/format";
import { currentNight, formatNight, isNightKey, previousNight } from "@/lib/night";
import { ensureReport, type ReportEntry } from "@/lib/report";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ night: string }> };

function editionDate(night: string) {
  if (!isDemoRun(night)) return formatNight(night);
  const d = night.slice(5);
  return `demo run, ${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(9, 11)}:${d.slice(11, 13)} UTC`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { night } = await params;
  if (!isNightKey(night) && !isDemoRun(night)) return { title: "Morning Report · Night Shift" };
  const title = `Morning Report, ${editionDate(night)} · Night Shift`;
  return { title, openGraph: { title }, twitter: { card: "summary_large_image", title } };
}

// Live extras for the report's projects: scout notes, analysis, founder calls.
async function loadExtras(ids: string[]) {
  const empty = {
    notes: new Map<string, { note: string; wallet: string }[]>(),
    analysis: new Map<string, AnalysisRow>(),
    decisions: new Map<string, Decision>(),
  };
  if (ids.length === 0) return empty;
  const supabase = db();
  const [flares, analysis, claims] = await Promise.all([
    supabase.from("flares").select("project_id, note, wallet, created_at").in("project_id", ids).not("note", "is", null),
    supabase.from("project_analysis").select("*").in("project_id", ids),
    supabase.from("claims").select("project_id, decision").in("project_id", ids).eq("verified", true).not("decision", "is", null),
  ]);
  for (const f of (flares.data ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const list = empty.notes.get(f.project_id) ?? [];
    list.push({ note: f.note, wallet: f.wallet });
    empty.notes.set(f.project_id, list);
  }
  for (const a of analysis.data ?? []) empty.analysis.set(a.project_id, a as AnalysisRow);
  for (const c of claims.data ?? []) empty.decisions.set(c.project_id, c.decision as Decision);
  return empty;
}

export default async function ReportPage({ params }: Props) {
  const { night } = await params;
  const demo = isDemoRun(night);
  if (!isNightKey(night) && !demo) notFound();

  const stillOpen = demo ? (await currentDemoRun()).night === night : night >= currentNight();
  const report = stillOpen ? null : await ensureReport(night, { demo }).catch(() => null);
  const extras = await loadExtras(report?.entries.map((e) => e.id) ?? []);
  const top = report?.entries.slice(0, 3) ?? [];
  const rest = report?.entries.slice(3) ?? [];
  const totalFlares = report?.entries.reduce((n, e) => n + e.flares, 0) ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <article className="pt-8 sm:pt-14">
        <p className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest text-signal">
          The Morning Report · {editionDate(night)}
          {demo && <DemoBadge />}
        </p>

        {demo && (
          <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
            This is a demo edition made from guest flares in the sandbox. It isn&apos;t real activity.{" "}
            <Link href="/demo" className="underline">Run another night</Link>.
          </p>
        )}

        {stillOpen && (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The board is still open.</h1>
            <p className="mt-4 text-muted">
              This edition comes out at dawn, once the scouts have spent their flares.{" "}
              <Link href={demo ? "/demo" : "/"} className="text-signal hover:underline">
                Go to the board
              </Link>
              .
            </p>
          </>
        )}

        {!stillOpen && !report && (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A quiet night.</h1>
            <p className="mt-4 text-muted">
              No scouts lit a flare this night, so there is no report.{" "}
              <Link href="/demo" className="text-signal hover:underline">
                See how a full night plays out in the demo
              </Link>
              .
            </p>
          </>
        )}

        {report && (
          <>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{report.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{report.intro}</p>
            <p className="mt-4 max-w-2xl text-sm text-muted/80">
              Night Shift is for people who find great indie apps before everyone else. Founders get the reasons scouts
              backed them, an honest read on launch readiness, and a clear next step.
            </p>

            <div className="mt-6">
              <ShareButton title={report.headline} path={`/report/${night}`} />
            </div>

            <figure className="mt-8 overflow-hidden rounded-2xl border border-line">
              <Skyline lit={totalFlares} glow={1} label="The city at dawn, with one lit window for every flare that night" />
            </figure>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-muted">
              <span>{report.entries.length} projects</span>
              <span>{totalFlares} flares</span>
              <span>Board locked at dawn</span>
            </div>

            <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted">The top {top.length}</h2>
            <ol className="mt-3 flex flex-col gap-4">
              {top.map((e, i) => (
                <TopEntry key={e.id} entry={e} rank={i + 1} demo={demo} extras={extras} />
              ))}
            </ol>

            {rest.length > 0 && (
              <>
                <h2 className="mt-10 font-mono text-xs uppercase tracking-widest text-muted">Also on the board</h2>
                <ol className="mt-3 flex flex-col gap-2">
                  {rest.map((e, i) => (
                    <li key={e.id} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel px-4 py-3">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-sm text-muted">{String(i + 4).padStart(2, "0")}</span>{" "}
                        <Link href={`/project/${e.id}`} className="font-semibold hover:text-signal">
                          {e.title}
                        </Link>
                      </span>
                      <span className="shrink-0 font-mono text-sm text-signal">✦ {e.flares}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </>
        )}
      </article>

      <nav className="mt-12 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
        {demo ? (
          <Link href="/demo" className="hover:text-ink">
            ← Demo edition
          </Link>
        ) : (
          <Link href={`/report/${previousNight(night)}`} className="hover:text-ink">
            ← Earlier edition
          </Link>
        )}
        <Link href="/" className="hover:text-ink">
          Tonight&apos;s board →
        </Link>
      </nav>
    </div>
  );
}

function TopEntry({
  entry: e,
  rank,
  demo,
  extras,
}: {
  entry: ReportEntry;
  rank: number;
  demo: boolean;
  extras: Awaited<ReturnType<typeof loadExtras>>;
}) {
  const notes = extras.notes.get(e.id) ?? [];
  const decision = extras.decisions.get(e.id);
  return (
    <li className={`rounded-2xl border bg-panel p-4 sm:p-5 ${rank === 1 ? "border-signal/50" : "border-line"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className={`font-mono text-sm ${rank === 1 ? "text-signal" : "text-muted"}`}>
              {String(rank).padStart(2, "0")}
            </span>
            <Link href={`/project/${e.id}`} className="truncate text-xl font-semibold hover:text-signal">
              {e.title}
            </Link>
            <a
              href={e.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 text-sm text-muted hover:text-signal"
              aria-label={`Open ${e.title}`}
            >
              ↗
            </a>
          </div>
          {e.why && <p className="mt-2 leading-relaxed text-ink">{e.why}</p>}
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-sm text-signal">
          <span aria-hidden>✦</span>
          {e.flares}
        </span>
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {notes.slice(0, 3).map((n, i) => (
            <li key={i} className="border-l-2 border-signal/40 pl-3 text-sm">
              <span className="text-ink">&ldquo;{n.note}&rdquo;</span>{" "}
              <span className="font-mono text-xs text-muted">
                {demo || n.wallet.startsWith("guest:") ? (
                  scoutLabel(n.wallet)
                ) : (
                  <Link href={`/scout/${n.wallet}`} className="hover:text-ink">
                    {shortAddress(n.wallet)}
                  </Link>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <AnalysisPanel analysis={extras.analysis.get(e.id) ?? null} compact />
      </div>

      {decision && (
        <div className="mt-3">
          <DecisionBadge decision={decision} />
        </div>
      )}
    </li>
  );
}
