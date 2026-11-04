import "server-only";
import { createPublicClient, http, isAddress, type Hex } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

// Works for regular wallets and smart wallets (ERC-1271 / ERC-6492), such as
// Coinbase Smart Wallet, because the check runs against Base.
export async function verifyWalletSignature(address: string, message: string, signature: string) {
  if (!isAddress(address) || !/^0x[0-9a-fA-F]+$/.test(signature)) return false;
  try {
    return await publicClient.verifyMessage({ address, message, signature: signature as Hex });
  } catch {
    return false;
  }
}
