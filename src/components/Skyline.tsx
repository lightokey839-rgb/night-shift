// The city at night. Every lit window is one flare; as dawn gets closer the
// horizon warms and the stars fade. Pure SVG, rendered on the server, laid
// out from a fixed seed so the city looks the same on every visit.

const WIDTH = 800;
const HEIGHT = 240;
const GROUND = 232;
const WIN = 5;
const GAP = 5;

type Building = { x: number; w: number; h: number; tower?: boolean };
type Window = { x: number; y: number; order: number };

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layout() {
  const rand = mulberry32(2026);
  const buildings: Building[] = [];
  let x = 0;
  while (x < WIDTH) {
    const w = 36 + Math.floor(rand() * 40);
    const h = 60 + Math.floor(rand() * 110);
    buildings.push({ x, w, h });
    x += w + 2 + Math.floor(rand() * 6);
  }
  // The tallest building, near the middle, carries the >_ sign.
  const mid = buildings.reduce((best, b, i) =>
    Math.abs(b.x + b.w / 2 - WIDTH / 2) < Math.abs(buildings[best].x + buildings[best].w / 2 - WIDTH / 2) ? i : best, 0);
  buildings[mid] = { ...buildings[mid], w: Math.max(buildings[mid].w, 58), h: 196, tower: true };

  const windows: Window[] = [];
  for (const b of buildings) {
    const cols = Math.floor((b.w - GAP) / (WIN + GAP));
    const rows = Math.floor((b.h - 14) / (WIN + GAP));
    const left = b.x + (b.w - cols * (WIN + GAP) + GAP) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        windows.push({ x: left + c * (WIN + GAP), y: GROUND - b.h + 10 + r * (WIN + GAP), order: rand() });
      }
    }
  }
  // Windows light up in a fixed random order, so flare N always lights the same window.
  windows.sort((a, b) => a.order - b.order);

  const stars = Array.from({ length: 40 }, () => ({
    x: rand() * WIDTH,
    y: rand() * 110,
    r: rand() < 0.15 ? 1.2 : 0.7,
  }));
  return { buildings, windows, stars };
}

const CITY = layout();

export function Skyline({
  lit,
  glow,
  label,
  animateDawn = false,
}: {
  lit: number;
  glow: number;
  label: string;
  // Fade the dawn sky in as the page opens (the Morning Report).
  animateDawn?: boolean;
}) {
  const g = Math.min(1, Math.max(0, glow));
  const shown = Math.min(lit, CITY.windows.length);
  const tower = CITY.buildings.find((b) => b.tower)!;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label} className="block h-auto w-full">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070b14" />
          <stop offset="0.6" stopColor="#0d1526" />
          <stop offset="1" stopColor="#14213a" />
        </linearGradient>
        <linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#f59e0b" stopOpacity="0" />
          <stop offset="0.8" stopColor="#f97316" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.6" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={WIDTH} height={HEIGHT} fill="url(#sky)" />
      <rect width={WIDTH} height={HEIGHT} fill="url(#dawn)" opacity={g} className={animateDawn ? "dawn-rise" : undefined} />

      <g fill="#e6ecf5" opacity={0.8 * (1 - g)}>
        {CITY.stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} />
        ))}
      </g>

      <g fill="#0a101c">
        {CITY.buildings.map((b, i) => (
          <rect key={i} x={b.x} y={GROUND - b.h} width={b.w} height={b.h + (HEIGHT - GROUND)} />
        ))}
        <rect x={tower.x + tower.w / 2 - 1} y={GROUND - tower.h - 18} width={2} height={18} />
      </g>

      <text
        x={tower.x + tower.w / 2}
        y={GROUND - tower.h - 4}
        textAnchor="middle"
        className="fill-signal font-mono"
        fontSize="13"
        fontWeight="700"
        filter="url(#glow)"
      >
        &gt;_
      </text>

      <g>
        {CITY.windows.map((w, i) => {
          const on = i < shown;
          return (
            <rect
              key={i}
              x={w.x}
              y={w.y}
              width={WIN}
              height={WIN}
              rx={0.8}
              fill={on ? "#3ef08a" : "#1a2436"}
              filter={on ? "url(#glow)" : undefined}
              className={on ? "skyline-lit" : undefined}
              // Switch on one by one, in lighting order, then flicker out of step.
              style={
                on
                  ? { animationDelay: `${Math.min(i * 0.18, 4)}s, ${Math.min(i * 0.18, 4) + 0.7 + (i % 7) * 0.7}s` }
                  : undefined
              }
            />
          );
        })}
      </g>
    </svg>
  );
}

// The same city as a standalone SVG string, for generated images (share
// cards, the cover). Same layout, inline colours, a soft halo on lit windows.
export function skylineSvg(lit: number, glow: number): string {
  const g = Math.min(1, Math.max(0, glow));
  const shown = Math.min(lit, CITY.windows.length);
  const tower = CITY.buildings.find((b) => b.tower)!;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`,
    `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b14"/><stop offset="0.6" stop-color="#0d1526"/><stop offset="1" stop-color="#14213a"/></linearGradient>`,
    `<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0.35" stop-color="#f59e0b" stop-opacity="0"/><stop offset="0.8" stop-color="#f97316" stop-opacity="0.35"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0.6"/></linearGradient></defs>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#s)"/>`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#d)" opacity="${g}"/>`,
    ...CITY.stars.map((s) => `<circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r}" fill="#e6ecf5" opacity="${(0.8 * (1 - g)).toFixed(2)}"/>`),
    ...CITY.buildings.map((b) => `<rect x="${b.x}" y="${GROUND - b.h}" width="${b.w}" height="${b.h + (HEIGHT - GROUND)}" fill="#0a101c"/>`),
    `<rect x="${tower.x + tower.w / 2 - 1}" y="${GROUND - tower.h - 18}" width="2" height="18" fill="#0a101c"/>`,
    // The >_ sign drawn as shapes: image renderers may have no font for SVG text.
    (() => {
      const cx = tower.x + tower.w / 2;
      const base = GROUND - tower.h - 5;
      return (
        `<path d="M${cx - 9} ${base - 10} L${cx - 3} ${base - 5} L${cx - 9} ${base}" fill="none" stroke="#3ef08a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<rect x="${cx - 1}" y="${base - 1}" width="9" height="2.2" rx="1" fill="#3ef08a"/>`
      );
    })(),
    ...CITY.windows.map((w, i) =>
      i < shown
        ? `<rect x="${w.x - 1.5}" y="${w.y - 1.5}" width="${WIN + 3}" height="${WIN + 3}" rx="2" fill="#3ef08a" opacity="0.25"/><rect x="${w.x}" y="${w.y}" width="${WIN}" height="${WIN}" rx="0.8" fill="#3ef08a"/>`
        : `<rect x="${w.x}" y="${w.y}" width="${WIN}" height="${WIN}" rx="0.8" fill="#1a2436"/>`,
    ),
    `</svg>`,
  ];
  return parts.join("");
}

// 0 for most of the night, rising to 1 over the last few hours before dawn.
export function dawnGlow(msToDawn: number, hours = 5): number {
  return 1 - Math.min(1, Math.max(0, msToDawn / (hours * 3_600_000)));
}
