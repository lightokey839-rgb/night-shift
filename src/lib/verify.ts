import "server-only";
import { createHash } from "node:crypto";
import { createPublicClient, http, isAddress, type Hex } from "viem";
import { base } from "viem/chains";
import { SIGNATURE_TTL_MS, signedMessage, type Envelope } from "./signing";
import { db } from "./supabase";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL, { timeout: 5_000, retryCount: 1 }),
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

// The host this request was made to, which signed messages must name.
export function requestDomain(req: Request): string {
  return req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
}

// Rebuilds the signed message, checks the signature, domain and expiry, then
// burns the nonce so the same signature can never be used twice.
// Returns the exact message on success, or an error string.
export async function verifySigned(
  req: Request,
  action: string,
  fields: [string, string][],
  address: string,
  signature: string,
  envelope: Envelope,
): Promise<{ ok: true; message: string } | { ok: false; error: string; status: number }> {
  const issued = Date.parse(envelope.issuedAt);
  const expires = Date.parse(envelope.expiresAt);
  const now = Date.now();
  if (Number.isNaN(issued) || Number.isNaN(expires)) return { ok: false, error: "Bad signature dates.", status: 400 };
  if (expires <= now) return { ok: false, error: "That signature expired. Please try again.", status: 401 };
  if (issued > now + 60_000 || expires - issued > SIGNATURE_TTL_MS) {
    return { ok: false, error: "Signature dates are not valid.", status: 401 };
  }

  const message = signedMessage(action, fields, address, requestDomain(req), envelope);
  if (!(await verifyWalletSignature(address, message, signature))) {
    return { ok: false, error: "Signature check failed.", status: 401 };
  }

  const used = await db().from("used_nonces").insert({ nonce: envelope.nonce, wallet: address.toLowerCase() });
  if (used.error) {
    return used.error.code === "23505"
      ? { ok: false, error: "That signature was already used. Please try again.", status: 409 }
      : { ok: false, error: "Couldn't record the signature.", status: 500 };
  }
  return { ok: true, message };
}

// A salted hash of the caller's IP, used only for rate limits.
export function ipHash(req: Request): string {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const salt = process.env.IP_HASH_SALT ?? "night-shift";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
