import Link from "next/link";
import type { BoardItem } from "@/lib/board";
import { shortAddress } from "@/lib/format";
import { BUILT_WITH, type BuiltWith } from "@/lib/submissions";
import { DecisionBadge } from "./DecisionBadge";

export function scoutLabel(wallet: string) {
  return wallet.startsWith("guest:") ? "a guest" : shortAddress(wallet);
}

// One project on a board. The scouts' own words lead; the site's summary is
// secondary. `action` is the flare control (wallet or guest).
export function BoardCard({ item, rank, action }: { item: BoardItem; rank: number; action: React.ReactNode }) {
  const [lead, ...more] = item.notes;
  const builtWith = item.built_with && item.built_with in BUILT_WITH ? BUILT_WITH[item.built_with as BuiltWith] : null;

  return (
    <li className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-muted">{String(rank).padStart(2, "0")}</span>
            <Link href={`/project/${item.id}`} className="truncate text-lg font-semibold hover:text-signal">
              {item.title}
            </Link>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="shrink-0 text-sm text-muted hover:text-signal"
              aria-label={`Open ${item.title}`}
            >
              ↗
            </a>
            {item.is_demo && <DemoBadge />}
          </div>

          {lead ? (
            <blockquote className="mt-2 border-l-2 border-signal/50 pl-3 text-ink">
              &ldquo;{lead.note}&rdquo;
              <footer className="mt-1 font-mono text-xs text-muted">
                {item.is_demo ? (
                  scoutLabel(lead.wallet)
                ) : (
                  <Link href={`/scout/${lead.wallet}`} className="hover:text-ink">
                    {scoutLabel(lead.wallet)}
                  </Link>
                )}
                {more.length > 0 && (
                  <Link href={`/project/${item.id}`} className="ml-2 hover:text-ink">
                    +{more.length} more {more.length === 1 ? "note" : "notes"}
                  </Link>
                )}
              </footer>
            </blockquote>
          ) : null}

          <p className="mt-2 text-sm leading-relaxed text-muted">{item.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.decision && <DecisionBadge decision={item.decision} />}
            {builtWith && (
              <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted">
                built with {builtWith}
              </span>
            )}
            {item.tags.map((t) => (
              <span key={t} className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
        </div>
        {action}
      </div>
    </li>
  );
}

export function DemoBadge() {
  return (
    <span className="shrink-0 rounded-full border border-amber-300/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-amber-200">
      Demo
    </span>
  );
}
