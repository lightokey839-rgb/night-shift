"use client";

import { useState } from "react";
import { BUILT_WITH, NOTE_MAX, type BuiltWith } from "@/lib/submissions";
import { useFlare } from "./useFlare";

export function ScoutForm({ night }: { night: string }) {
  const { flare, pending, connected } = useFlare(night);
  const [url, setUrl] = useState("");
  const [builtWith, setBuiltWith] = useState<BuiltWith | "">("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!builtWith) return setStatus({ ok: false, message: "Pick what it was built with." });
    setStatus(null);
    const result = await flare(url, note, builtWith);
    setStatus(result);
    if (result.ok) {
      setUrl("");
      setNote("");
      setBuiltWith("");
    }
  }

  const field =
    "min-w-0 rounded-xl border border-line bg-night px-4 py-3 text-ink placeholder:text-muted/60 focus:border-signal focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ scout a project</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="scout-url">App URL</label>
        <input
          id="scout-url"
          type="url"
          required
          pattern="https://.*"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://their-app.xyz"
          className={field}
        />
        <label className="sr-only" htmlFor="scout-built">Built with</label>
        <select
          id="scout-built"
          required
          value={builtWith}
          onChange={(e) => setBuiltWith(e.target.value as BuiltWith)}
          className={`${field} ${builtWith ? "" : "text-muted/60"}`}
        >
          <option value="" disabled>
            Built with…
          </option>
          {Object.entries(BUILT_WITH).map(([value, label]) => (
            <option key={value} value={value} className="text-ink">
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <label className="sr-only" htmlFor="scout-note">Why you&apos;re backing it</label>
        <input
          id="scout-note"
          required
          maxLength={NOTE_MAX}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why it deserves a shot (shown on the board)"
          className={`${field} w-full`}
        />
        <p className="mt-1 text-right font-mono text-xs text-muted/70">
          {note.length}/{NOTE_MAX}
        </p>
      </div>

      <button
        type="submit"
        disabled={pending || !connected}
        className="mt-1 w-full rounded-xl bg-signal px-5 py-3 font-semibold text-night hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Checking the app…" : "Light a flare"}
      </button>
      <p className={`mt-2 text-sm ${status ? (status.ok ? "text-signal" : "text-amber-300") : "text-muted"}`} role="status">
        {status?.message ??
          (connected
            ? "You sign a message to flare it. No gas, no transaction. Indie apps only; big platforms are skipped."
            : "Connect a wallet to scout, or try the demo edition without one.")}
      </p>
    </form>
  );
}
