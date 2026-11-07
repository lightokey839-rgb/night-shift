import "server-only";
import { firstClaim, type ClaimRow, type Decision } from "./claims";
import { DEMO_POOL } from "./demo";
import { db, type Project } from "./supabase";

export type BoardNote = { note: string; wallet: string };

export type BoardItem = Project & {
  built_with: string | null;
  is_demo: boolean;
  flareCount: number;
  notes: BoardNote[];
  decision: Decision | null;
};

type Row = Project & {
  built_with: string | null;
  is_demo: boolean;
  flares: { note: string | null; wallet: string; created_at: string }[];
  claims: ClaimRow | ClaimRow[] | null;
};

// A night's board, ranked by flares (earliest first on ties). Real and demo
// boards never mix: with `demo`, `night` is a demo run and the board is the
// demo pool with that run's guest flares.
export async function loadBoard(night: string, demo = false): Promise<{ items: BoardItem[]; error: string | null }> {
  try {
    const select = "*, flares(note, wallet, created_at), claims(founder_wallet, verified, decision)";
    const query = demo
      ? db().from("projects").select(select).eq("night", DEMO_POOL).eq("is_demo", true).eq("flares.night", night)
      : db().from("projects").select(select).eq("night", night).eq("is_demo", false);
    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) return { items: [], error: error.message };
    const items = (data as Row[]).map(toItem).sort((a, b) => b.flareCount - a.flareCount);
    return { items, error: null };
  } catch (e) {
    return { items: [], error: e instanceof Error ? e.message : "Database unavailable" };
  }
}

function toItem({ flares, claims, ...p }: Row): BoardItem {
  const claim = firstClaim(claims);
  const notes = [...flares]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .filter((f): f is { note: string; wallet: string; created_at: string } => Boolean(f.note))
    .map((f) => ({ note: f.note, wallet: f.wallet }));
  return { ...p, flareCount: flares.length, notes, decision: claim?.verified ? claim.decision : null };
}
