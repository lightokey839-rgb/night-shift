import { NextResponse } from "next/server";
import { currentNight, previousNight } from "@/lib/night";
import { publishDawn } from "@/lib/report";

export const maxDuration = 60;

// Called by Vercel Cron just after dawn (see vercel.json) to refresh the
// analyst on the top projects and publish the Morning Report for the night
// that just locked. Also usable by the owner as a manual fallback:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/dawn
// Safe to call repeatedly: the first saved report wins and later calls return it.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const night = new URL(req.url).searchParams.get("night") ?? previousNight(currentNight());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night) || night >= currentNight()) {
    return NextResponse.json({ error: "That night hasn't locked yet." }, { status: 400 });
  }
  const report = await publishDawn(night);
  return NextResponse.json({ night, published: Boolean(report), projects: report?.entries.length ?? 0 });
}
