import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { currentNight, FLARES_PER_NIGHT } from "@/lib/night";
import { db } from "@/lib/supabase";

// GET ?wallet=0x... -> how many of tonight's flares that wallet has used.
// Flares are public anyway (they are shown on the board), so no auth needed.
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet") ?? "";
  if (!isAddress(wallet)) return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });

  const night = currentNight();
  const { count, error } = await db()
    .from("flares")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet.toLowerCase())
    .eq("night", night);
  if (error) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

  return NextResponse.json({ night, used: count ?? 0, total: FLARES_PER_NIGHT });
}
