"use client";

import { useState } from "react";
import { useFlare } from "./useFlare";

export function ScoutForm({ night }: { night: string }) {
  const { flare, pending, connected } = useFlare(night);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const result = await flare(url);
    setStatus(result);
    if (result.ok) setUrl("");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <label htmlFor="scout-url" className="font-mono text-xs uppercase tracking-widest text-signal">
        &gt;_ scout a project
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="scout-url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://their-app.xyz"
          className="min-w-0 flex-1 rounded-xl border border-line bg-night px-4 py-3 text-ink placeholder:text-muted/60 focus:border-signal focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !connected}
          className="rounded-xl bg-signal px-5 py-3 font-semibold text-night hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Reading the page…" : "Light a flare"}
        </button>
      </div>
      <p className={`mt-2 text-sm ${status ? (status.ok ? "text-signal" : "text-amber-300") : "text-muted"}`}>
        {status?.message ??
          (connected
            ? "You sign a message to flare it. No gas, no transaction."
            : "Connect a wallet to scout. Browsing is open to everyone.")}
      </p>
    </form>
  );
}
