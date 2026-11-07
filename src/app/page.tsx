import Link from "next/link";
import { DawnCountdown } from "@/components/DawnCountdown";
import { DecisionBadge } from "@/components/DecisionBadge";
import { FlareButton } from "@/components/FlareButton";
import { ScoutForm } from "@/components/ScoutForm";
import { SiteHeader } from "@/components/SiteHeader";
import { dawnGlow, Skyline } from "@/components/Skyline";
import { firstClaim, type ClaimRow } from "@/lib/claims";
import { shortAddress } from "@/lib/format";
import { currentNight, DAWN_HOUR_UTC, FLARES_PER_NIGHT, formatNight, nextDawn } from "@/lib/night";
import { latestReportNight } from "@/lib/report";
import { db, type Project } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type BoardRow = Project & { flares: { count: number }[]; claims: ClaimRow | ClaimRow[] | null };

function decisionOf(row: BoardRow) {
  const claim = firstClaim(row.claims);
  return claim?.verified ? claim.decision : null;
}

const HOW_IT_WORKS = [
  {
    title: "Scout",
    body: `Paste a vibecoded app you believe in. You get ${FLARES_PER_NIGHT} flares a night, so pick carefully. Each one is signed by your wallet.`,
  },
  {
    title: "Dawn",
    body: `At ${String(DAWN_HOUR_UTC).padStart(2, "0")}:00 UTC the board locks. The Morning Report ranks what the scouts backed and why.`,
  },
  {
    title: "Decide",
    body: "Founders wake up to real signal from real wallets and choose what happens next.",
  },
];

async function loadBoard(night: string): Promise<{ rows: BoardRow[]; error: string | null }> {
  try {
    const { data, error } = await db()
      .from("projects")
      .select("*, flares(count), claims(founder_wallet, verified, decision)")
      .eq("night", night)
      .order("created_at", { ascending: true });
    if (error) return { rows: [], error: error.message };
    const rows = (data as BoardRow[]).sort(
      (a, b) => (b.flares[0]?.count ?? 0) - (a.flares[0]?.count ?? 0),
    );
    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : "Database unavailable" };
  }
}

export default async function Home() {
  const night = currentNight();
  const dawn = nextDawn();
  const [{ rows, error }, lastReport] = await Promise.all([
    loadBoard(night),
    latestReportNight().catch(() => null),
  ]);
  const totalFlares = rows.reduce((n, p) => n + (p.flares[0]?.count ?? 0), 0);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      {lastReport && (
        <Link
          href={`/report/${lastReport}`}
          className="group mt-2 flex items-center justify-between gap-4 rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3 text-sm hover:border-signal/60"
        >
          <span>
            <span className="font-mono text-xs uppercase tracking-widest text-signal">Morning Report</span>
            <span className="ml-3 text-muted">{formatNight(lastReport)}</span>
          </span>
          <span className="text-signal group-hover:translate-x-0.5">Read →</span>
        </Link>
      )}

      <section className="pt-8 pb-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Night of {night} · board locks at dawn
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Scouts find them overnight.
          <br />
          <span className="text-muted">Founders decide at dawn.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Every scout gets {FLARES_PER_NIGHT} flares a night. Spend them on the vibecoded apps you
          think deserve a shot. At {String(DAWN_HOUR_UTC).padStart(2, "0")}:00 UTC the board locks and
          the best finds go to the Morning Report.
        </p>
      </section>

      <figure className="relative mb-8 overflow-hidden rounded-2xl border border-line">
        <Skyline
          lit={totalFlares}
          glow={dawnGlow(dawn.getTime() - Date.now())}
          label={`City skyline at night with ${totalFlares} lit ${totalFlares === 1 ? "window" : "windows"}, one per flare tonight`}
        />
        <div className="absolute left-4 top-4 hidden items-center gap-3 rounded-full border border-line bg-night/80 px-4 py-2 text-sm backdrop-blur sm:inline-flex">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signal" aria-hidden />
          <span className="text-muted">Dawn in</span>
          <DawnCountdown dawn={dawn.toISOString()} />
        </div>
        <figcaption className="flex items-center justify-between gap-3 border-t border-line bg-panel px-4 py-2 font-mono text-xs text-muted">
          <span className="whitespace-nowrap">
            <span className="hidden sm:inline">Every lit window is a flare tonight · </span>
            <span className="text-signal">
              <span className="sm:hidden">✦ </span>
              {totalFlares} lit
            </span>
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap sm:hidden">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" aria-hidden />
            dawn in <DawnCountdown dawn={dawn.toISOString()} />
          </span>
        </figcaption>
      </figure>

      <ol className="mb-8 grid gap-3 sm:grid-cols-3">
        {HOW_IT_WORKS.map((step, i) => (
          <li key={step.title} className="rounded-2xl border border-line bg-panel/60 p-4">
            <p className="font-mono text-xs text-signal">
              {String(i + 1).padStart(2, "0")} · {step.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <ScoutForm night={night} />

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Tonight&apos;s board</h2>
          <span className="font-mono text-xs text-muted">
            {rows.length} {rows.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {error && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-200">
            The board can&apos;t load yet: {error}. Check the Supabase settings in your environment.
          </p>
        )}

        {!error && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            The board is dark. Be the first scout tonight.
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {rows.map((p, i) => (
            <li key={p.id} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <Link href={`/project/${p.id}`} className="truncate text-lg font-semibold hover:text-signal">
                      {p.title}
                    </Link>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="shrink-0 text-sm text-muted hover:text-signal"
                      aria-label={`Open ${p.title}`}
                    >
                      ↗
                    </a>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {decisionOf(p) && <DecisionBadge decision={decisionOf(p)!} />}
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
                        {t}
                      </span>
                    ))}
                    <Link href={`/scout/${p.scout_wallet}`} className="font-mono text-xs text-muted/70 hover:text-ink">
                      scouted by {shortAddress(p.scout_wallet)}
                    </Link>
                  </div>
                </div>
                <FlareButton night={night} url={p.url} count={p.flares[0]?.count ?? 0} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-auto pt-16 text-center font-mono text-xs text-muted/70">
        Built for Vibeathon 02 · Night shift
      </footer>
    </div>
  );
}
