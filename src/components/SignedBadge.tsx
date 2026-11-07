"use client";

import { useState } from "react";

type Check = { valid: boolean; message: string; signature: string } | { error: string };

// "✓ signed": opens the exact message the wallet signed and re-checks the
// signature on Base, so anyone can confirm a flare wasn't faked.
export function SignedBadge({ flareId }: { flareId: string }) {
  const [open, setOpen] = useState(false);
  const [check, setCheck] = useState<Check | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !check) {
      setLoading(true);
      try {
        const res = await fetch(`/api/flares/${flareId}/verify`);
        setCheck(await res.json());
      } catch {
        setCheck({ error: "Couldn't reach the server." });
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1 self-start rounded-full border border-signal/40 px-2 py-0.5 font-mono text-xs text-signal hover:bg-signal/10"
      >
        ✓ signed
      </button>
      {open && (
        <span className="mt-2 block w-full rounded-xl border border-line bg-night p-3 text-xs">
          {loading && <span className="text-muted">Checking the signature on Base…</span>}
          {check && "error" in check && <span className="text-amber-300">{check.error}</span>}
          {check && "valid" in check && (
            <>
              <span className={`block font-semibold ${check.valid ? "text-signal" : "text-amber-300"}`}>
                {check.valid ? "Valid: this wallet signed this flare." : "Signature does not match."}
              </span>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-muted">{check.message}</pre>
              <span className="mt-2 block break-all font-mono text-muted/60">{check.signature}</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
