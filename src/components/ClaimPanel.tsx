"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { claimFields, DECISIONS, type ClaimAction, type Decision } from "@/lib/claims";
import { shortAddress } from "@/lib/format";
import { newEnvelope, signedMessage } from "@/lib/signing";

type Props = {
  projectId: string;
  claim: { founder_wallet: string; verified: boolean; decision: Decision | null } | null;
};

export function ClaimPanel({ projectId, claim }: Props) {
  const router = useRouter();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [snippet, setSnippet] = useState<string | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const me = address?.toLowerCase();
  const isFounder = Boolean(me && claim?.verified && claim.founder_wallet === me);
  const claimedByOther = Boolean(claim?.verified && claim.founder_wallet !== me);

  async function send(step: "claim" | "verify" | "decide", decision?: Decision) {
    if (!address) return;
    const action: ClaimAction = step === "decide" ? `decide:${decision!}` : step;
    setPending(true);
    setStatus(null);
    try {
      const envelope = newEnvelope();
      const signature = await signMessageAsync({
        message: signedMessage(action, claimFields(projectId), address, window.location.host, envelope),
      });
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step, projectId, address, signature, decision, envelope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ ok: false, message: data.error ?? "Something went wrong." });
        return;
      }
      if (data.snippet) setSnippet(data.snippet);
      if (data.verified || data.decision) {
        setSnippet(null);
        setStatus({ ok: true, message: data.decision ? "Decision saved." : "Verified. It's yours." });
        router.refresh();
      }
    } catch {
      setStatus({ ok: false, message: "Signature cancelled." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ for the founder</p>

      {claimedByOther && (
        <p className="mt-3 text-muted">
          Claimed and verified by its founder ({shortAddress(claim!.founder_wallet)}).
        </p>
      )}

      {!claimedByOther && !address && (
        <p className="mt-3 text-muted">Built this? Connect the wallet you want to use as founder to claim it.</p>
      )}

      {!claimedByOther && address && !isFounder && !snippet && (
        <div className="mt-3">
          <p className="text-muted">
            Built this? Claim it to tell scouts what happens next. You&apos;ll prove you run the site by adding
            one line to it.
          </p>
          <button
            onClick={() => send("claim")}
            disabled={pending}
            className="mt-4 rounded-xl bg-signal px-5 py-3 font-semibold text-night hover:brightness-110 disabled:opacity-50"
          >
            {claim && !claim.verified && claim.founder_wallet === me ? "Continue my claim" : "Claim this project"}
          </button>
        </div>
      )}

      {snippet && (
        <div className="mt-3">
          <p className="text-muted">
            Add this line inside the <code className="font-mono text-ink">&lt;head&gt;</code> of your homepage and
            deploy. Then come back and verify.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-xl border border-line bg-night px-4 py-3 font-mono text-sm text-ink">
              {snippet}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(snippet).then(() => setCopied(true), () => {});
              }}
              className="rounded-xl border border-line px-4 py-3 text-sm hover:border-signal"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Tip: ask your AI coding tool to &ldquo;add this meta tag to the head of my homepage&rdquo;.
          </p>
          <button
            onClick={() => send("verify")}
            disabled={pending}
            className="mt-4 rounded-xl bg-signal px-5 py-3 font-semibold text-night hover:brightness-110 disabled:opacity-50"
          >
            {pending ? "Checking your site…" : "Verify"}
          </button>
        </div>
      )}

      {isFounder && (
        <div className="mt-3">
          <p className="text-muted">You&apos;re the verified founder. What happens next?</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(Object.keys(DECISIONS) as Decision[]).map((d) => (
              <button
                key={d}
                onClick={() => send("decide", d)}
                disabled={pending}
                className={`rounded-xl border p-3 text-left disabled:opacity-60 ${
                  claim?.decision === d ? "border-signal bg-signal/10" : "border-line hover:border-signal/60"
                }`}
              >
                <span className="block font-semibold">{DECISIONS[d].action}</span>
                <span className="mt-1 block text-xs text-muted">{DECISIONS[d].blurb}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {status && <p className={`mt-3 text-sm ${status.ok ? "text-signal" : "text-amber-300"}`}>{status.message}</p>}
    </section>
  );
}
