// Shared by client and server: founder decisions and the messages founders sign.

export const DECISIONS = {
  raise: { label: "Raising", action: "Raise on Vibestarter", blurb: "Ready to raise. Backers, take a look." },
  keep_building: { label: "Keep building", action: "Keep building", blurb: "Heads down, shipping the next version." },
  need_testers: { label: "Needs testers", action: "Find testers", blurb: "Looking for people to try it and give feedback." },
} as const;

export type Decision = keyof typeof DECISIONS;

export function isDecision(value: unknown): value is Decision {
  return typeof value === "string" && value in DECISIONS;
}

export type ClaimAction = "claim" | "verify" | `decide:${Decision}`;

export function claimMessage(action: ClaimAction, projectId: string, wallet: string): string {
  return [`Night Shift · ${action}`, `Project: ${projectId}`, `Wallet: ${wallet.toLowerCase()}`].join("\n");
}

// The snippet a founder adds to their site to prove they control it.
export function verifySnippet(code: string): string {
  return `<meta name="night-shift-verify" content="${code}">`;
}

export const VIBESTARTER_URL = "https://app.vibestarter.xyz";

// Claims come back from a Supabase join as an object or a one-item array.
export type ClaimRow = { founder_wallet: string; verified: boolean; decision: Decision | null };

export function firstClaim(value: ClaimRow | ClaimRow[] | null | undefined): ClaimRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
