import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { shortAddress } from "@/lib/format";
import { currentNight, formatNight, isNightKey, previousNight } from "@/lib/night";
import { ensureReport } from "@/lib/report";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ night: string }> };

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
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="truncate text-lg font-semibold hover:text-signal"
                        >
                          {e.title}
                        </a>
                      </div>
                      {e.why && <p className="mt-2 leading-relaxed text-ink">{e.why}</p>}
                      <p className="mt-2 text-sm leading-relaxed text-muted">{e.summary}</p>
                      <p className="mt-3 font-mono text-xs text-muted/70">scouted by {shortAddress(e.scout_wallet)}</p>
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
