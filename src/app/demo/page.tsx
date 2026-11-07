import type { Metadata } from "next";
import Link from "next/link";
import { BoardCard, DemoBadge } from "@/components/BoardCard";
import { GuestFlareButton, RunDawnButton } from "@/components/DemoControls";
import { SiteHeader } from "@/components/SiteHeader";
import { Skyline } from "@/components/Skyline";
import { loadBoard } from "@/lib/board";
import { currentDemoRun, guestWallet } from "@/lib/demo";
import { FLARES_PER_NIGHT } from "@/lib/night";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Demo edition · Night Shift" };

export default async function DemoPage() {
  const { night: run } = await currentDemoRun();
  const [{ items, error }, guest] = await Promise.all([loadBoard(run, true), guestWallet(false)]);
  const totalFlares = items.reduce((n, p) => n + p.flareCount, 0);

  let used = 0;
  if (guest) {
    const { count } = await db()
      .from("flares")
      .select("id", { count: "exact", head: true })
      .eq("wallet", `${guest}:${run}`)
      .eq("night", run);
    used = count ?? 0;
  }
  const left = Math.max(0, FLARES_PER_NIGHT - used);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <section className="pt-8 pb-6 sm:pt-14">
        <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-amber-200">
          Demo edition <DemoBadge />
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          See a whole night in a minute.
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          No wallet needed. Flare up to {FLARES_PER_NIGHT} demo projects as a guest with a note on why, then run dawn
          to lock the board and read its Morning Report. The real board locks once a day at 06:00 UTC; this is a
          sandbox, and nothing here counts toward real rankings or scout records.
        </p>
      </section>

      <figure className="mb-6 overflow-hidden rounded-2xl border border-line">
        <Skyline lit={totalFlares} glow={0.15} label={`Demo skyline with ${totalFlares} lit windows`} />
        <figcaption className="flex items-center justify-between gap-3 border-t border-line bg-panel px-4 py-2 font-mono text-xs text-muted">
          <span className="text-signal">✦ {totalFlares} lit</span>
          <span>
            your guest flares: <span className="text-ink">{left} left</span>
          </span>
        </figcaption>
      </figure>

      <div className="mb-8 rounded-2xl border border-amber-300/30 bg-amber-300/5 p-4">
        <RunDawnButton canRun={totalFlares > 0} />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Demo board</h2>
          <span className="font-mono text-xs text-muted">{items.length} demo projects</span>
        </div>

        {error && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/5 p-4 text-sm text-amber-200" role="alert">
            The demo board can&apos;t load right now. Please refresh in a moment.
          </p>
        )}

        {!error && items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            No demo projects yet. The owner loads them from <code className="font-mono">data/seed.json</code>.
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {items.map((item, i) => (
            <BoardCard
              key={item.id}
              item={item}
              rank={i + 1}
              action={<GuestFlareButton projectId={item.id} count={item.flareCount} disabled={left === 0} />}
            />
          ))}
        </ol>
      </section>

      <p className="mt-10 text-center text-sm text-muted">
        Ready for the real thing?{" "}
        <Link href="/" className="text-signal hover:underline">
          Scout tonight&apos;s board
        </Link>
      </p>
    </div>
  );
}
