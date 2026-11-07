import { ImageResponse } from "next/og";
import { isDemoRun } from "@/lib/demo";
import { formatNight, isNightKey } from "@/lib/night";
import { db } from "@/lib/supabase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The Night Shift Morning Report";

// Share card for an edition: its date, headline and top three. Reads only the
// stored report (no AI call), so it is fast and never fails the page.
export default async function Image({ params }: { params: Promise<{ night: string }> }) {
  const { night } = await params;
  const demo = isDemoRun(night);
  let headline = "The board locked at dawn.";
  let top: { title: string; flares: number }[] = [];

  if (isNightKey(night) || demo) {
    try {
      const { data } = await db().from("reports").select("ranking").eq("night", night).maybeSingle();
      if (data?.ranking) {
        headline = data.ranking.headline ?? headline;
        top = (data.ranking.entries ?? []).slice(0, 3);
      }
    } catch {
      // Fall back to the generic card.
    }
  }
  const date = demo ? "Demo edition" : isNightKey(night) ? formatNight(night) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          color: "#e6ecf5",
          background: "linear-gradient(180deg, #070b14 0%, #0d1526 55%, #3b2a14 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30 }}>
          <span style={{ color: "#3ef08a", fontWeight: 700 }}>&gt;_</span>
          <span style={{ fontWeight: 700 }}>Night Shift</span>
          <span style={{ color: "#8b97ab" }}>· The Morning Report</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ color: "#3ef08a", fontSize: 26, textTransform: "uppercase", letterSpacing: 4 }}>{date}</span>
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{headline}</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 28 }}>
          {top.map((t, i) => (
            <span key={i} style={{ display: "flex", gap: 10, color: i === 0 ? "#3ef08a" : "#e6ecf5" }}>
              <span style={{ color: "#8b97ab" }}>{String(i + 1).padStart(2, "0")}</span>
              {t.title.slice(0, 28)}
              <span style={{ color: "#3ef08a" }}>✦ {t.flares}</span>
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
