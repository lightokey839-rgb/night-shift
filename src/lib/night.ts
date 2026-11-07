// Shared by client and server. A night closes at dawn (DAWN_HOUR_UTC) and is
// keyed by that dawn's UTC date, e.g. "2026-11-05".

export const DAWN_HOUR_UTC = Number(process.env.NEXT_PUBLIC_DAWN_HOUR_UTC ?? 6);
export const FLARES_PER_NIGHT = 3;

// In local development only, DEV_FAKE_NOW (an ISO time) moves the server's
// clock so dawn and the Morning Report can be tested without waiting.
function clockNow(): Date {
  const fake = process.env.NODE_ENV === "development" ? process.env.DEV_FAKE_NOW : undefined;
  return fake ? new Date(fake) : new Date();
}

export function nextDawn(now: Date = clockNow()): Date {
  const dawn = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAWN_HOUR_UTC),
  );
  if (now.getTime() >= dawn.getTime()) dawn.setUTCDate(dawn.getUTCDate() + 1);
  return dawn;
}

export function currentNight(now: Date = clockNow()): string {
  return nextDawn(now).toISOString().slice(0, 10);
}

// The night before `night`, i.e. the one whose dawn was a day earlier.
export function previousNight(night: string): string {
  const d = new Date(`${night}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function isNightKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

// "Saturday 7 November 2026": the morning a night's report comes out.
export function formatNight(night: string): string {
  return new Date(`${night}T12:00:00Z`).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// The action-specific lines of a signed flare (see signing.ts for the rest).
// The server rebuilds them from the request, so both sides must match.
export function flareFields(url: string, night: string, note: string, builtWith: string): [string, string][] {
  return [
    ["Project", url],
    ["Night", night],
    ["Built with", builtWith],
    ["Note", note],
  ];
}
