// Shared by client and server: the envelope every signed Night Shift message
// carries. The domain ties a signature to this site, the nonce makes it
// single-use (the server records it in used_nonces), and the expiry bounds it.

export const SIGNATURE_TTL_MS = 10 * 60 * 1000;

export type Envelope = { nonce: string; issuedAt: string; expiresAt: string };

export function newEnvelope(now = Date.now()): Envelope {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return {
    nonce: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SIGNATURE_TTL_MS).toISOString(),
  };
}

// fields: the action-specific lines, e.g. [["Project", url], ["Night", night]].
export function signedMessage(
  action: string,
  fields: [string, string][],
  wallet: string,
  domain: string,
  envelope: Envelope,
): string {
  return [
    `Night Shift · ${action}`,
    ...fields.map(([k, v]) => `${k}: ${v}`),
    `Wallet: ${wallet.toLowerCase()}`,
    `Domain: ${domain}`,
    `Nonce: ${envelope.nonce}`,
    `Issued: ${envelope.issuedAt}`,
    `Expires: ${envelope.expiresAt}`,
  ].join("\n");
}

export function isEnvelope(value: unknown): value is Envelope {
  const v = value as Envelope;
  return (
    typeof v?.nonce === "string" &&
    /^[0-9a-f]{32}$/.test(v.nonce) &&
    typeof v.issuedAt === "string" &&
    typeof v.expiresAt === "string"
  );
}
