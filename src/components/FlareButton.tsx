"use client";

import { useState } from "react";
import { NOTE_MAX } from "@/lib/submissions";
import { useFlare } from "./useFlare";

// Flares an existing project. Opens a short note field first: every flare
// carries a signed reason.
export function FlareButton({
  night,
  url,
  count,
  builtWith,
}: {
  night: string;
  url: string;
  count: number;
  builtWith: string;
}) {
  const { flare, pending, connected } = useFlare(night);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await flare(url, note, builtWith);
    setStatus(result);
    if (result.ok) {
      setOpen(false);
      setNote("");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={pending || !connected}
        aria-expanded={open}
        title={connected ? "Spend one of tonight's flares on this project" : "Connect a wallet to flare"}
        className="flex items-center gap-2 rounded-full border border-signal/40 px-3 py-1.5 font-mono text-sm text-signal hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>✦</span>
        <span>{count}</span>
        <span className="sr-only">flares, flare this project</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-1 flex w-56 flex-col gap-2 sm:w-64">
          <label className="sr-only" htmlFor={`note-${url}`}>Why you&apos;re backing it</label>
          <input
            id={`note-${url}`}
            autoFocus
            required
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why? (shown on the board)"
            className="rounded-lg border border-line bg-night px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-signal focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-night disabled:opacity-60"
          >
            {pending ? "Signing…" : "Sign & flare"}
          </button>
        </form>
      )}
      {status && (
        <span className={`text-xs ${status.ok ? "text-signal" : "text-amber-300"}`} role="status">
          {status.message}
        </span>
      )}
    </div>
  );
}
