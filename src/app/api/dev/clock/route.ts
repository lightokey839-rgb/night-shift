import { NextResponse } from "next/server";

// Development only: moves the server clock (DEV_FAKE_NOW, read by
// lib/night.ts) so the smoke test can cross dawn. 404 everywhere else.
export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const { now } = (await req.json().catch(() => ({}))) as { now?: string | null };
  if (now && Number.isNaN(Date.parse(now))) return NextResponse.json({ error: "Bad time" }, { status: 400 });
  if (now) process.env.DEV_FAKE_NOW = now;
  else delete process.env.DEV_FAKE_NOW;
  return NextResponse.json({ now: process.env.DEV_FAKE_NOW ?? null });
}
