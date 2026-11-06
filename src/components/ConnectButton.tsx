"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-full border border-line px-4 py-2 font-mono text-sm text-muted hover:border-signal hover:text-ink"
        title="Disconnect"
      >
        {shortAddress(address)}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-night hover:brightness-110 disabled:opacity-60"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {error && !open && (
        <p className="absolute right-0 mt-2 w-56 text-right text-xs text-amber-300">
          {/* wagmi's error type omits this name, but injected() throws it when no wallet is installed */}
          {(error.name as string) === "ProviderNotFoundError"
            ? "No wallet found. Install a browser wallet such as Coinbase Wallet or MetaMask."
            : "Couldn't connect. Try again."}
        </p>
      )}
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-line bg-panel p-2 shadow-xl">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
            >
              {connector.name === "Injected" ? "Browser wallet" : connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
