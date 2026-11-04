// Shared by client and server. A night closes at dawn (DAWN_HOUR_UTC) and is
// keyed by that dawn's UTC date, e.g. "2026-11-05".

export const DAWN_HOUR_UTC = Number(process.env.NEXT_PUBLIC_DAWN_HOUR_UTC ?? 6);
export const FLARES_PER_NIGHT = 3;

export function nextDawn(now: Date = new Date()): Date {
  const dawn = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAWN_HOUR_UTC),
  );
  if (now.getTime() >= dawn.getTime()) dawn.setUTCDate(dawn.getUTCDate() + 1);
  return dawn;
}

export function currentNight(now: Date = new Date()): string {
  return nextDawn(now).toISOString().slice(0, 10);
}

// The exact text a scout signs to flare a project. The server rebuilds it from
// the request and verifies the signature, so both sides must match.
export function flareMessage(url: string, night: string, wallet: string): string {
  return [
    "Night Shift · flare",
    `Project: ${url}`,
    `Night: ${night}`,
    `Wallet: ${wallet.toLowerCase()}`,
  ].join("\n");
}

// Canonical form used to spot the same project submitted twice in one night.
export function normalizeUrl(input: string): { url: string; key: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  parsed.hash = "";
  const url = parsed.toString();
  const key = `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/$/, "")}`.toLowerCase();
  return { url, key };
}
