"use client";

import { useState } from "react";
import { useFlare } from "./useFlare";

export function FlareButton({ night, url, count }: { night: string; url: string; count: number }) {
  const { flare, pending, connected } = useFlare(night);
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={async () => setNote((await flare(url)).message)}
        disabled={pending || !connected}
        title={connected ? "Spend one of tonight's flares on this project" : "Connect a wallet to flare"}
        className="flex items-center gap-2 rounded-full border border-signal/40 px-3 py-1.5 font-mono text-sm text-signal hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>✦</span>
        <span>{count}</span>
        <span className="sr-only">flares, flare this project</span>
      </button>
      {note && <span className="text-xs text-muted">{note}</span>}
    </div>
  );
}
