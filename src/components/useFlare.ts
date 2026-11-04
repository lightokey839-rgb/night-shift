"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { flareMessage, normalizeUrl } from "@/lib/night";

// Signs a flare for `url` on `night` and posts it. Returns a status message.
export function useFlare(night: string) {
  const router = useRouter();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [pending, setPending] = useState(false);

  async function flare(url: string): Promise<{ ok: boolean; message: string }> {
    if (!address) return { ok: false, message: "Connect a wallet first." };
    const normalized = normalizeUrl(url);
    if (!normalized) return { ok: false, message: "That doesn't look like a valid web address." };

    setPending(true);
    try {
      const signature = await signMessageAsync({
        message: flareMessage(normalized.url, night, address),
      });
      const res = await fetch("/api/flare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized.url, address, signature, night }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, message: data.error ?? "Something went wrong." };
      router.refresh();
      return { ok: true, message: "Flare lit." };
    } catch {
      return { ok: false, message: "Signature cancelled." };
    } finally {
      setPending(false);
    }
  }

  return { flare, pending, connected: Boolean(address) };
}
