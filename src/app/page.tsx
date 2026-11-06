import { ConnectButton } from "@/components/ConnectButton";
import { DawnCountdown } from "@/components/DawnCountdown";
import { FlareButton } from "@/components/FlareButton";
import { ScoutForm } from "@/components/ScoutForm";
import { shortAddress } from "@/lib/format";
import { currentNight, DAWN_HOUR_UTC, FLARES_PER_NIGHT, nextDawn } from "@/lib/night";
import { db, type Project } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type BoardRow = Project & { flares: { count: number }[] };

async function loadBoard(night: string): Promise<{ rows: BoardRow[]; error: string | null }> {
  try {
    const { data, error } = await db()
      .from("projects")
      .select("*, flares(count)")
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
  const { rows, error } = await loadBoard(night);

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg text-signal">&gt;_</span>
          <span className="font-semibold tracking-tight">Night Shift</span>
        </div>
        <ConnectButton />
      </header>

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
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-line bg-panel px-4 py-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-signal" aria-hidden />
          <span className="text-muted">Dawn in</span>
          <DawnCountdown dawn={dawn.toISOString()} />
        </div>
      </section>

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
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="truncate text-lg font-semibold hover:text-signal"
                    >
                      {p.title}
                    </a>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {p.tags.map((t) => (
                      <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
                        {t}
                      </span>
                    ))}
                    <span className="font-mono text-xs text-muted/70">
                      scouted by {shortAddress(p.scout_wallet)}
                    </span>
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
