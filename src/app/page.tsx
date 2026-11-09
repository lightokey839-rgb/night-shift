import Link from "next/link";
import { BoardCard } from "@/components/BoardCard";
import { DawnCountdown } from "@/components/DawnCountdown";
import { FlareButton } from "@/components/FlareButton";
import { ScoutForm } from "@/components/ScoutForm";
import { SiteHeader } from "@/components/SiteHeader";
import { dawnGlow, Skyline } from "@/components/Skyline";
import { loadBoard } from "@/lib/board";
import { currentNight, DAWN_HOUR_UTC, FLARES_PER_NIGHT, formatNight, nextDawn } from "@/lib/night";
import { latestReportNight } from "@/lib/report";

export const dynamic = "force-dynamic";

const HOW_IT_WORKS = [
  {
    title: "Scout",
    body: `Paste an indie vibecoded app and say why it deserves a shot. You get ${FLARES_PER_NIGHT} flares a night, each signed by your wallet.`,
  },
  {
    title: "Dawn",
    body: `At ${String(DAWN_HOUR_UTC).padStart(2, "0")}:00 UTC the board locks. The Morning Report ranks what scouts backed, in their own words.`,
  },
  {
    title: "Decide",
    body: "Founders claim their app, read the signal, and choose: raise, keep building, or find testers.",
  },
];

export default async function Home() {
  const night = currentNight();
  const dawn = nextDawn();
  const [{ items, error }, lastReport] = await Promise.all([
    loadBoard(night),
    latestReportNight().catch(() => null),
  ]);
  const totalFlares = items.reduce((n, p) => n + p.flareCount, 0);

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
          Scouts back indie apps overnight.
          <br />
          <span className="text-muted">Founders decide at dawn.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          A night shift for discovering indie vibecoded apps: scouts back the ones they believe in with signed
          flares and a reason, and founders wake up to real signal on whether to raise, keep building, or find
          testers.
        </p>
      </section>

      <figure className="relative mb-8 overflow-hidden rounded-2xl border border-line">
        <div className="relative">
          <Skyline
            lit={totalFlares}
            glow={dawnGlow(dawn.getTime() - Date.now())}
            label={`City skyline at night with ${totalFlares} lit ${totalFlares === 1 ? "window" : "windows"}, one per flare tonight`}
          />
          <div className="rain" aria-hidden />
        </div>
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

      <Link
        href="/demo"
        className="group mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/5 px-4 py-3 text-sm hover:border-amber-300/60"
      >
        <span>
          <span className="font-mono text-xs uppercase tracking-widest text-amber-200">No wallet?</span>
          <span className="ml-3 text-muted">Try the demo edition: flare as a guest and run dawn now.</span>
        </span>
        <span className="text-amber-200 group-hover:translate-x-0.5">→</span>
      </Link>

      <ScoutForm night={night} />

      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Tonight&apos;s board</h2>
          <span className="font-mono text-xs text-muted">
            {items.length} {items.length === 1 ? "project" : "projects"}
          </span>
        </div>

        {error && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-200" role="alert">
            The board can&apos;t load right now. Please refresh in a moment.
          </p>
        )}

        {!error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            The board is dark. Be the first scout tonight, or{" "}
            <Link href="/demo" className="text-signal hover:underline">
              see how a night plays out
            </Link>
            .
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {items.map((item, i) => (
            <BoardCard
              key={item.id}
              item={item}
              rank={i + 1}
              action={
                <FlareButton night={night} url={item.url} count={item.flareCount} builtWith={item.built_with ?? "other"} />
              }
            />
          ))}
        </ol>
      </section>

      <footer className="mt-auto flex flex-wrap justify-center gap-x-4 gap-y-2 pt-16 text-center font-mono text-xs text-muted/70">
        <span>Built for Vibeathon 02 · Night shift</span>
        <Link href="/about" className="hover:text-ink">How it&apos;s built</Link>
        <Link href="/pitch" className="hover:text-ink">Pitch</Link>
      </footer>
    </div>
  );
}
