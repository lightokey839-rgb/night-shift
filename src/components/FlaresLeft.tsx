"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { FLARE_LIT_EVENT } from "./useFlare";

// "✦ ✦ ✧ 2 left": tonight's flares for the connected wallet.
export function FlaresLeft() {
  const { address } = useAccount();
  const [state, setState] = useState<{ used: number; total: number } | null>(null);

  useEffect(() => {
    if (!address) {
      setState(null);
      return;
    }
    let cancelled = false;
    const load = () =>
      fetch(`/api/flares?wallet=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && d && setState({ used: d.used, total: d.total }))
        .catch(() => {});
    load();
    window.addEventListener(FLARE_LIT_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(FLARE_LIT_EVENT, load);
    };
  }, [address]);

  if (!state) return null;
  const left = Math.max(0, state.total - state.used);

  return (
    <Link
      href={`/scout/${address!.toLowerCase()}`}
      className="flex items-center gap-2 rounded-full border border-line px-3 py-2 font-mono text-sm hover:border-signal"
      title={`${left} of ${state.total} flares left tonight. Open your scout record.`}
    >
      <span aria-hidden className="tracking-widest">
        {Array.from({ length: state.total }, (_, i) => (
          <span key={i} className={i < left ? "text-signal" : "text-muted/40"}>
            {i < left ? "✦" : "✧"}
          </span>
        ))}
      </span>
      <span className={left ? "text-ink" : "text-muted"}>
        {left}
        <span className="hidden sm:inline"> left</span>
      </span>
      <span className="sr-only">flares left tonight, open your scout record</span>
    </Link>
  );
}
