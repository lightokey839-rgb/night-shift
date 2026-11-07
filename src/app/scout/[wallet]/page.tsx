import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAddress } from "viem";
import { DecisionBadge } from "@/components/DecisionBadge";
import { SignedBadge } from "@/components/SignedBadge";
import { SiteHeader } from "@/components/SiteHeader";
import { shortAddress } from "@/lib/format";
import { formatNight } from "@/lib/night";
import { HIT_RANK, loadScoutRecord } from "@/lib/scouts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ wallet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;
  return { title: isAddress(wallet) ? `Scout ${shortAddress(wallet)} · Night Shift` : "Night Shift" };
}

export default async function ScoutPage({ params }: Props) {
  const { wallet: raw } = await params;
  if (!isAddress(raw)) notFound();
  const wallet = raw.toLowerCase();
  const record = await loadScoutRecord(wallet);
  const hitRate = record.settled ? Math.round((record.hits / record.settled) * 100) : null;

  const stats = [
    { label: "Flares lit", value: record.flares.length },
    { label: "Nights", value: record.nights },
    { label: "Surfaced first", value: record.surfaced },
    { label: "Hits", value: hitRate === null ? record.hits : `${record.hits} · ${hitRate}%` },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <section className="pt-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ scout record</p>
        <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">{shortAddress(wallet)}</h1>
        <p className="mt-2 break-all font-mono text-xs text-muted">{wallet}</p>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line bg-panel p-4">
              <dt className="font-mono text-xs uppercase tracking-widest text-muted">{s.label}</dt>
              <dd className="mt-2 text-2xl font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">
          A hit is a pick that finished in the top {HIT_RANK} at dawn, or whose founder chose to raise. Every flare
          is signed by this wallet: open any &ldquo;✓ signed&rdquo; to check it yourself.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">Flares</h2>

        {record.flares.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">
            No flares yet. <Link href="/" className="text-signal hover:underline">Scout tonight&apos;s board</Link>.
          </div>
        )}

        <ol className="flex flex-col gap-3">
          {record.flares.map((f) => (
            <li
              key={f.id}
              className={`rounded-2xl border bg-panel p-4 ${f.hit ? "border-signal/50" : "border-line"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted">
                    <Link href={`/report/${f.night}`} className="hover:text-ink">
                      {formatNight(f.night)}
                    </Link>
                  </p>
                  <Link
                    href={`/project/${f.project.id}`}
                    className="mt-1 block truncate text-lg font-semibold hover:text-signal"
                  >
                    {f.project.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <SignedBadge flareId={f.id} />
                    {f.surfaced && (
                      <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
                        surfaced first
                      </span>
                    )}
                    {f.decision && <DecisionBadge decision={f.decision} />}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-sm ${
                    f.hit ? "border-signal/50 text-signal" : "border-line text-muted"
                  }`}
                >
                  {f.rank === null ? "open" : `#${f.rank}`}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
