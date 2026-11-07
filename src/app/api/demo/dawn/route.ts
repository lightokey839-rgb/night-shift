import { NextResponse } from "next/server";
import { currentDemoRun, rotateDemoRun } from "@/lib/demo";
import { ensureReport } from "@/lib/report";
import { db } from "@/lib/supabase";

export const maxDuration = 30;

// POST -> "Run dawn now" for the demo edition: locks the open run, publishes
// its Morning Report (AI write-up if it answers within 7s, template if not),
// and opens a fresh run. Anyone can press it, at most once every 30 seconds.
export async function POST() {
  const { night } = await currentDemoRun();
  const { count } = await db()
    .from("flares")
    .select("id", { count: "exact", head: true })
    .eq("night", night)
    .eq("is_demo", true);
  if (!count) return NextResponse.json({ error: "Light at least one demo flare first." }, { status: 400 });

  const rotated = await rotateDemoRun();
  if ("waitMs" in rotated) {
    const seconds = Math.ceil(rotated.waitMs / 1000);
    return NextResponse.json({ error: `Dawn just ran. Try again in ${seconds}s.` }, { status: 429 });
  }

  await ensureReport(rotated.closed, { demo: true, timeoutMs: 7_000 }).catch((e) => {
    console.error("demo report failed", e);
  });
  return NextResponse.json({ ok: true, report: `/report/${rotated.closed}` });
}
