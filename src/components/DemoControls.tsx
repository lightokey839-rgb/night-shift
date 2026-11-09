"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NOTE_MAX } from "@/lib/submissions";

// Guest flare for a demo project: a short note, no wallet.
export function GuestFlareButton({ projectId, count, disabled }: { projectId: string; count: number; disabled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/demo/flare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, message: data.error ?? "Something went wrong." });
        return;
      }
      setStatus({ ok: true, message: data.already ? "Already flared." : "Flare lit." });
      setOpen(false);
      setNote("");
      router.refresh();
    } catch {
      setStatus({ ok: false, message: "Couldn't reach the server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || pending}
        aria-expanded={open}
        title={disabled ? "You've used your 3 demo flares" : "Flare this demo project as a guest"}
        className="flex items-center gap-2 rounded-full border border-signal/40 px-3 py-1.5 font-mono text-sm text-signal hover:bg-signal/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span aria-hidden>✦</span>
        <span>{count}</span>
        <span className="sr-only">flares, flare this demo project</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-1 flex w-56 flex-col gap-2 sm:w-64">
          <label className="sr-only" htmlFor={`demo-note-${projectId}`}>Why you&apos;re backing it</label>
          <input
            id={`demo-note-${projectId}`}
            autoFocus
            required
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why? (shown in the demo report)"
            className="rounded-lg border border-line bg-night px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-signal focus:outline-none"
          />
          <button type="submit" disabled={pending} className="rounded-lg bg-signal px-3 py-2 text-sm font-semibold text-night disabled:opacity-60">
            {pending ? "Lighting…" : "Flare as guest"}
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

// "Run dawn now": locks the demo run and opens its Morning Report.
export function RunDawnButton({ canRun }: { canRun: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/dawn", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setPending(false);
        return;
      }
      router.push(data.report);
    } catch {
      setError("Couldn't reach the server.");
      setPending(false);
    }
  }

  return (
    <div>
      {pending && (
        <div className="sunrise" role="status" aria-live="polite">
          <div className="relative text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-200">Dawn</p>
            <p className="mt-2 text-2xl font-semibold text-ink sm:text-3xl">The board is locking…</p>
            <p className="mt-2 text-sm text-muted">Writing the Morning Report</p>
          </div>
        </div>
      )}
      <button
        onClick={run}
        disabled={pending || !canRun}
        className="w-full rounded-xl bg-amber-300 px-5 py-3 font-semibold text-night hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? "The sun is coming up…" : "☀ Run dawn now"}
      </button>
      <p className="mt-2 text-sm text-muted" role="status">
        {error ??
          (canRun
            ? "Locks this demo board and publishes its Morning Report in a few seconds."
            : "Light at least one flare first, then run dawn.")}
      </p>
    </div>
  );
}
