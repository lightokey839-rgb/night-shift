import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimPanel } from "@/components/ClaimPanel";
import { DecisionBadge } from "@/components/DecisionBadge";
import { FlareButton } from "@/components/FlareButton";
import { SiteHeader } from "@/components/SiteHeader";
import { DECISIONS, firstClaim, type ClaimRow } from "@/lib/claims";
import { shortAddress } from "@/lib/format";
import { currentNight, formatNight } from "@/lib/night";
import { db, type Project } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };
type Row = Project & { flares: { count: number }[]; claims: ClaimRow | ClaimRow[] | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProject(id: string): Promise<Row | null> {
  if (!UUID.test(id)) return null;
  const { data } = await db()
    .from("projects")
    .select("*, flares(count), claims(founder_wallet, verified, decision)")
    .eq("id", id)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await loadProject((await params).id).catch(() => null);
  return { title: project ? `${project.title} · Night Shift` : "Night Shift" };
}

export default async function ProjectPage({ params }: Props) {
  const project = await loadProject((await params).id);
  if (!project) notFound();

  const claim = firstClaim(project.claims);
  const decision = claim?.verified ? claim.decision : null;
  const flares = project.flares[0]?.count ?? 0;
  const tonight = currentNight();
  const open = project.night === tonight;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6">
      <SiteHeader />

      <article className="pt-8 sm:pt-14">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {open ? "On tonight's board" : `Scouted the night of ${formatNight(project.night)}`}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{project.title}</h1>
          {open ? (
            <FlareButton night={tonight} url={project.url} count={flares} />
          ) : (
            <span className="flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 font-mono text-sm text-signal">
              <span aria-hidden>✦</span>
              {flares}
            </span>
          )}
        </div>
        <p className="mt-4 text-lg leading-relaxed text-muted">{project.summary}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {decision && <DecisionBadge decision={decision} />}
          {project.tags.map((t) => (
            <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
              {t}
            </span>
          ))}
          <span className="font-mono text-xs text-muted/70">scouted by {shortAddress(project.scout_wallet)}</span>
        </div>

        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-6 inline-flex rounded-xl border border-line px-5 py-3 text-sm hover:border-signal"
        >
          Open the app ↗
        </a>

        {decision && (
          <p className="mt-8 rounded-2xl border border-signal/30 bg-signal/5 p-4 text-sm">
            <span className="font-semibold text-signal">The founder&apos;s call: {DECISIONS[decision].label}.</span>{" "}
            <span className="text-muted">{DECISIONS[decision].blurb}</span>
          </p>
        )}

        <div className="mt-8">
          <ClaimPanel
            projectId={project.id}
            claim={claim ? { founder_wallet: claim.founder_wallet, verified: claim.verified, decision: claim.decision } : null}
          />
        </div>
      </article>

      <nav className="mt-12 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
        {open ? (
          <span />
        ) : (
          <Link href={`/report/${project.night}`} className="hover:text-ink">
            ← Morning Report
          </Link>
        )}
        <Link href="/" className="hover:text-ink">
          Tonight&apos;s board →
        </Link>
      </nav>
    </div>
  );
}
