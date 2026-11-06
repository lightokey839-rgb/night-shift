import { createConfig, http, injected } from "wagmi";
import { base } from "wagmi/chains";

// Browser wallets only. wagmi discovers every installed wallet (MetaMask,
// Rabby, Coinbase Wallet extension, ...) through EIP-6963, so each shows up
// by name. The "wagmi/connectors" bundle is avoided on purpose: it pulls in
// payment SDKs with optional dependencies that break the Next.js build.
export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [injected()],
  transports: { [base.id]: http() },
  ssr: true,
});
