import { NextResponse } from "next/server";
import { currentNight, previousNight } from "@/lib/night";
import { ensureReport } from "@/lib/report";

// Called by Vercel Cron just after dawn (see vercel.json) to publish the
// Morning Report for the night that just locked. Reports are also created on
// first visit, so a missed run only delays the AI write-up.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const night = previousNight(currentNight());
  const report = await ensureReport(night);
  return NextResponse.json({ night, published: Boolean(report), projects: report?.entries.length ?? 0 });
}
