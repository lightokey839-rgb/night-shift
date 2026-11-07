import "server-only";
import { firstClaim, type ClaimRow, type Decision } from "./claims";
import { currentNight } from "./night";
import { db } from "./supabase";

// A pick counts as a hit if it finished in the top 3 of a locked night, or its
// verified founder chose to raise.
export const HIT_RANK = 3;

export type ScoutFlare = {
  id: string;
  night: string;
  createdAt: string;
  project: { id: string; title: string; url: string };
  surfaced: boolean; // this wallet was the scout who first added the project
  rank: number | null; // final rank on a locked night, null while the night is open
  decision: Decision | null;
  hit: boolean;
};

export type ScoutRecord = {
  wallet: string;
  flares: ScoutFlare[];
  nights: number;
  surfaced: number;
  hits: number;
  settled: number; // flares on locked nights, the base for the hit rate
};

type FlareRow = {
  id: string;
  night: string;
  created_at: string;
  projects: { id: string; title: string; url: string; scout_wallet: string; claims: ClaimRow | ClaimRow[] | null };
};

export async function loadScoutRecord(wallet: string): Promise<ScoutRecord> {
  const supabase = db();
  const tonight = currentNight();

  const { data, error } = await supabase
    .from("flares")
    .select("id, night, created_at, projects(id, title, url, scout_wallet, claims(founder_wallet, verified, decision))")
    .eq("wallet", wallet)
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as FlareRow[];

  // Final ranks for every locked night this scout played, ordered like the Morning Report.
  const lockedNights = [...new Set(rows.map((r) => r.night))].filter((n) => n < tonight);
  const ranks = new Map<string, number>();
  if (lockedNights.length) {
    const { data: boards } = await supabase
      .from("projects")
      .select("id, night, created_at, flares(count)")
      .in("night", lockedNights)
      .eq("is_demo", false);
    const byNight = new Map<string, { id: string; created_at: string; flares: number }[]>();
    for (const p of (boards ?? []) as { id: string; night: string; created_at: string; flares: { count: number }[] }[]) {
      const list = byNight.get(p.night) ?? [];
      list.push({ id: p.id, created_at: p.created_at, flares: p.flares[0]?.count ?? 0 });
      byNight.set(p.night, list);
    }
    for (const list of byNight.values()) {
      list
        .sort((a, b) => b.flares - a.flares || a.created_at.localeCompare(b.created_at))
        .forEach((p, i) => ranks.set(p.id, i + 1));
    }
  }

  const flares = rows.map((r): ScoutFlare => {
    const claim = firstClaim(r.projects.claims);
    const decision = claim?.verified ? claim.decision : null;
    const rank = r.night < tonight ? (ranks.get(r.projects.id) ?? null) : null;
    return {
      id: r.id,
      night: r.night,
      createdAt: r.created_at,
      project: { id: r.projects.id, title: r.projects.title, url: r.projects.url },
      surfaced: r.projects.scout_wallet === wallet,
      rank,
      decision,
      hit: (rank !== null && rank <= HIT_RANK) || decision === "raise",
    };
  });

  return {
    wallet,
    flares,
    nights: new Set(rows.map((r) => r.night)).size,
    surfaced: flares.filter((f) => f.surfaced).length,
    hits: flares.filter((f) => f.hit).length,
    settled: flares.filter((f) => f.rank !== null).length,
  };
}
