import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";

// The demo edition: a permanent pool of demo projects (night = DEMO_POOL,
// is_demo = true, loaded from data/seed.json) and a series of short "runs".
// Guests flare during the open run; "Run dawn now" locks it, publishes its
// Morning Report, and opens the next run. Nothing here counts as real activity.

export const DEMO_POOL = "demo";
export const DEMO_DAWN_COOLDOWN_MS = 30_000;
const GUEST_COOKIE = "ns_guest";

export function isDemoRun(value: string): boolean {
  return /^demo-\d{8}T\d{6}$/.test(value);
}

function newRunKey(now = new Date()): string {
  return `demo-${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}`;
}

// The open demo run, creating the first one if needed.
export async function currentDemoRun(): Promise<{ night: string; lastDawnAt: string | null }> {
  const supabase = db();
  const { data } = await supabase.from("demo_state").select("night, last_dawn_at").eq("id", 1).maybeSingle();
  if (data) return { night: data.night, lastDawnAt: data.last_dawn_at };
  const night = newRunKey();
  await supabase.from("demo_state").upsert({ id: 1, night }, { onConflict: "id", ignoreDuplicates: true });
  const again = await supabase.from("demo_state").select("night, last_dawn_at").eq("id", 1).single();
  return { night: again.data?.night ?? night, lastDawnAt: again.data?.last_dawn_at ?? null };
}

// Locks the open run and opens the next one, at most once per cooldown. The
// conditional update makes this safe when several people press it at once.
export async function rotateDemoRun(): Promise<{ closed: string } | { waitMs: number }> {
  const supabase = db();
  const { night, lastDawnAt } = await currentDemoRun();
  const since = lastDawnAt ? Date.now() - Date.parse(lastDawnAt) : Infinity;
  if (since < DEMO_DAWN_COOLDOWN_MS) return { waitMs: DEMO_DAWN_COOLDOWN_MS - since };

  const now = new Date();
  let query = supabase
    .from("demo_state")
    .update({ night: newRunKey(now), last_dawn_at: now.toISOString(), updated_at: now.toISOString() })
    .eq("id", 1)
    .eq("night", night);
  query = lastDawnAt ? query.eq("last_dawn_at", lastDawnAt) : query.is("last_dawn_at", null);
  const { data } = await query.select("night");
  if (!data || data.length === 0) return { waitMs: DEMO_DAWN_COOLDOWN_MS };
  return { closed: night };
}

// The visitor's guest id, from an httpOnly cookie (set on first guest flare).
export async function guestWallet(create: boolean): Promise<string | null> {
  const jar = await cookies();
  let id = jar.get(GUEST_COOKIE)?.value;
  if (!id && create) {
    id = randomUUID();
    jar.set(GUEST_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return id && /^[0-9a-f-]{36}$/.test(id) ? `guest:${id}` : null;
}
