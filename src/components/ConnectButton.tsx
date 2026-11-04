"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
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
