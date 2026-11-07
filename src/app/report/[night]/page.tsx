import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionBadge } from "@/components/DecisionBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { Skyline } from "@/components/Skyline";
import type { Decision } from "@/lib/claims";
import { db } from "@/lib/supabase";
import { shortAddress } from "@/lib/format";
import { currentNight, formatNight, isNightKey, previousNight } from "@/lib/night";
import { ensureReport } from "@/lib/report";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ night: string }> };

// Founder decisions are live, unlike the locked ranking stored with the report.
async function loadDecisions(ids: string[]): Promise<Map<string, Decision>> {
  if (ids.length === 0) return new Map();
  const { data } = await db()
    .from("claims")
    .select("project_id, decision")
    .in("project_id", ids)
    .eq("verified", true)
    .not("decision", "is", null);
  return new Map((data ?? []).map((c) => [c.project_id as string, c.decision as Decision]));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { night } = await params;
  if (!isNightKey(night)) return { title: "Morning Report · Night Shift" };
  return { title: `Morning Report, ${formatNight(night)} · Night Shift` };
}

export default async function ReportPage({ params }: Props) {
  const { night } = await params;
  if (!isNightKey(night)) notFound();

  const tonight = currentNight();
  const stillOpen = night >= tonight;
  const report = stillOpen ? null : await ensureReport(night);
  const earlier = previousNight(night);
  const decisions = report ? await loadDecisions(report.entries.map((e) => e.id)) : new Map<string, Decision>();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <article className="pt-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">
          The Morning Report · {formatNight(night)}
        </p>

        {stillOpen && (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The board is still open.</h1>
            <p className="mt-4 text-muted">
              This edition comes out at dawn, once the scouts have spent their flares.{" "}
              <Link href="/" className="text-signal hover:underline">
                Go to tonight&apos;s board
              </Link>
              .
            </p>
          </>
        )}

        {!stillOpen && !report && (
          <>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">A quiet night.</h1>
            <p className="mt-4 text-muted">No scouts lit a flare this night, so there is no report.</p>
          </>
        )}

        {report && (
          <>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {report.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{report.intro}</p>

            <figure className="mt-8 overflow-hidden rounded-2xl border border-line">
              <Skyline
                lit={report.entries.reduce((n, e) => n + e.flares, 0)}
                glow={1}
                label="The city at dawn, with one lit window for every flare that night"
              />
            </figure>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-muted">
              <span>{report.entries.length} projects</span>
              <span>{report.entries.reduce((n, e) => n + e.flares, 0)} flares</span>
              <span>Board locked at dawn</span>
            </div>

            <ol className="mt-10 flex flex-col gap-3">
              {report.entries.map((e, i) => (
                <li
                  key={e.id}
                  className={`rounded-2xl border bg-panel p-4 sm:p-5 ${i === 0 ? "border-signal/50" : "border-line"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className={`font-mono text-sm ${i === 0 ? "text-signal" : "text-muted"}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Link href={`/project/${e.id}`} className="truncate text-lg font-semibold hover:text-signal">
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
                      <p className="mt-2 text-sm leading-relaxed text-muted">{e.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {decisions.get(e.id) && <DecisionBadge decision={decisions.get(e.id)!} />}
                        <Link
                          href={`/scout/${e.scout_wallet}`}
                          className="font-mono text-xs text-muted/70 hover:text-ink"
                        >
                          scouted by {shortAddress(e.scout_wallet)}
                        </Link>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-sm text-signal">
                      <span aria-hidden>✦</span>
                      {e.flares}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </article>

      <nav className="mt-12 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
        <Link href={`/report/${earlier}`} className="hover:text-ink">
          ← Earlier edition
        </Link>
        <Link href="/" className="hover:text-ink">
          Tonight&apos;s board →
        </Link>
      </nav>
    </div>
  );
}
