import { ImageResponse } from "next/og";
import { skylineSvg } from "@/components/Skyline";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Night Shift: scouts back indie apps overnight. Founders decide at dawn.";

// The site's cover and default share image: the night city with the >_ tower,
// windows lit as if scouts were out, and the tagline. Purely illustrative.
export default function Image() {
  const city = `data:image/svg+xml;utf8,${encodeURIComponent(skylineSvg(46, 0.25))}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#070b14" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={city} width={1200} height={360} alt="" style={{ position: "absolute", left: 0, bottom: 0 }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            color: "#e6ecf5",
            background: "linear-gradient(180deg, rgba(7,11,20,0.95) 0%, rgba(7,11,20,0.75) 45%, rgba(7,11,20,0) 70%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
            <span style={{ color: "#3ef08a" }}>&gt;_</span>
            <span>Night Shift</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 36, fontSize: 68, fontWeight: 700, lineHeight: 1.08 }}>
            <span>Scouts back indie apps overnight.</span>
            <span style={{ color: "#8b97ab" }}>Founders decide at dawn.</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
