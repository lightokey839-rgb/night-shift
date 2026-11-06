import { redirect } from "next/navigation";
import { previousNight, currentNight } from "@/lib/night";
import { latestReportNight } from "@/lib/report";

export const dynamic = "force-dynamic";

// Sends readers to the newest edition that has projects in it.
export default async function LatestReport() {
  const night = (await latestReportNight().catch(() => null)) ?? previousNight(currentNight());
  redirect(`/report/${night}`);
}
