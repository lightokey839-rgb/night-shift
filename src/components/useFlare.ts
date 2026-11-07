"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { flareFields } from "@/lib/night";
import { newEnvelope, signedMessage } from "@/lib/signing";
import { cleanNote, normalizeUrl, NOTE_MAX } from "@/lib/submissions";

// Fired on window after a flare is saved, so counters can refresh.
export const FLARE_LIT_EVENT = "nightshift:flare-lit";

// Signs a flare (with its note) for `url` on `night` and posts it.
export function useFlare(night: string) {
  const router = useRouter();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [pending, setPending] = useState(false);

  async function flare(url: string, rawNote: string, builtWith: string): Promise<{ ok: boolean; message: string }> {
    if (!address) return { ok: false, message: "Connect a wallet first." };
    const normalized = normalizeUrl(url);
    if (!normalized) return { ok: false, message: "Use the app's full https:// address." };
    const note = cleanNote(rawNote);
    if (!note) return { ok: false, message: `Add a note on why (up to ${NOTE_MAX} characters).` };

    setPending(true);
    try {
      const envelope = newEnvelope();
      const fields = flareFields(normalized.url, night, note, builtWith);
      const signature = await signMessageAsync({
        message: signedMessage("flare", fields, address, window.location.host, envelope),
      });
      const res = await fetch("/api/flare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized.url, address, signature, night, note, builtWith, envelope }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data.error ?? "Something went wrong." };
      router.refresh();
      window.dispatchEvent(new Event(FLARE_LIT_EVENT));
      return { ok: true, message: data.already ? "You'd already flared this one." : "Flare lit." };
    } catch {
      return { ok: false, message: "Signature cancelled." };
    } finally {
      setPending(false);
    }
  }

  return { flare, pending, connected: Boolean(address) };
}
