// Shared by client and server: what can be scouted.

export const BUILT_WITH = {
  lovable: "Lovable",
  bolt: "Bolt",
  replit: "Replit",
  v0: "v0",
  cursor: "Cursor",
  "claude-code": "Claude Code",
  codex: "Codex",
  other: "Other",
} as const;

export type BuiltWith = keyof typeof BUILT_WITH;

export function isBuiltWith(value: unknown): value is BuiltWith {
  return typeof value === "string" && value in BUILT_WITH;
}

export const NOTE_MAX = 140;

export function cleanNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const note = value.replace(/\s+/g, " ").trim();
  return note.length >= 1 && note.length <= NOTE_MAX ? note : null;
}

// Big brands and platforms, not indie vibecoded apps. Subdomains count too,
// but hosting suffixes such as vercel.app or github.io stay allowed.
const BLOCKED_DOMAINS = [
  "openai.com", "chatgpt.com", "anthropic.com", "claude.ai", "google.com", "gemini.google.com",
  "apple.com", "microsoft.com", "amazon.com", "meta.com", "facebook.com", "instagram.com",
  "x.com", "twitter.com", "youtube.com", "tiktok.com", "linkedin.com", "reddit.com",
  "github.com", "gitlab.com", "vercel.com", "netlify.com", "notion.so", "wikipedia.org",
  "base.org", "coinbase.com", "binance.com", "uniswap.org", "robinhood.com", "ethereum.org",
  "lovable.dev", "bolt.new", "replit.com", "v0.dev", "cursor.com",
];

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

// Canonical form; https only. The key is used to spot the same project twice.
export function normalizeUrl(input: string): { url: string; key: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  parsed.hash = "";
  const url = parsed.toString();
  const key = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
  return { url, key };
}
