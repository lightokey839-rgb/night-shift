import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { verifyWalletSignature } from "@/lib/verify";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET -> re-checks a stored flare's signature against Base, so anyone can
// confirm the wallet really signed it. Returns the signed message too.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Invalid flare id" }, { status: 400 });

  const { data } = await db().from("flares").select("wallet, message, signature").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Flare not found" }, { status: 404 });

  const valid = await verifyWalletSignature(data.wallet, data.message, data.signature);
  return NextResponse.json({ valid, wallet: data.wallet, message: data.message, signature: data.signature });
}
