import { NextResponse } from "next/server";
import { refreshAnalysis } from "@/lib/analyst";
import { DEMO_POOL } from "@/lib/demo";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

// Owner-only: runs the overnight analyst on demo projects that don't have a
// ready analysis yet. Called by scripts/seed-demo.mjs after seeding.
//   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/demo/analyze
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = db();
  const { data } = await supabase
    .from("projects")
    .select("id, url, project_analysis(status)")
    .eq("night", DEMO_POOL)
    .eq("is_demo", true);
  const todo = (data ?? []).filter((p) => {
    const a = Array.isArray(p.project_analysis) ? p.project_analysis[0] : p.project_analysis;
    return !a || (a as { status: string }).status !== "ready";
  });
  const results = await Promise.allSettled(todo.slice(0, 8).map((p) => refreshAnalysis(p.id, p.url)));
  return NextResponse.json({ analysed: results.length, remaining: Math.max(0, todo.length - 8) });
}
