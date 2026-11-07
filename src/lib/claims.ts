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

// The action-specific lines of a signed claim step (see signing.ts for the rest).
export function claimFields(projectId: string): [string, string][] {
  return [["Project", projectId]];
}

// The snippet a founder adds to their site to prove they control it.
export function verifySnippet(code: string): string {
  return `<meta name="night-shift-verify" content="${code}">`;
}

// Where "Raise on Vibestarter" links. Hidden when unset.
export const VIBESTARTER_APPLY_URL = process.env.NEXT_PUBLIC_VIBESTARTER_APPLY_URL || null;

// Claims come back from a Supabase join as an object or a one-item array.
export type ClaimRow = { founder_wallet: string; verified: boolean; decision: Decision | null };

export function firstClaim(value: ClaimRow | ClaimRow[] | null | undefined): ClaimRow | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
