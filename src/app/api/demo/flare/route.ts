import { NextResponse } from "next/server";
import { currentDemoRun, DEMO_POOL, guestWallet } from "@/lib/demo";
import { FLARES_PER_NIGHT } from "@/lib/night";
import { cleanNote, NOTE_MAX } from "@/lib/submissions";
import { db } from "@/lib/supabase";
import { ipHash } from "@/lib/verify";

const GUEST_FLARES_PER_IP_PER_HOUR = 30;

// POST { projectId, note } -> a guest flare in the open demo run. No wallet:
// guests are identified by an httpOnly cookie, limited to 3 flares per run by
// the same database constraint as real scouts, and never counted as real.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const projectId = body?.projectId;
  const note = cleanNote(body?.note);
  if (typeof projectId !== "string") return error("Missing project.", 400);
  if (!note) return error(`Add a note on why (up to ${NOTE_MAX} characters).`, 400);

  const supabase = db();
  const project = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("night", DEMO_POOL)
    .eq("is_demo", true)
    .maybeSingle();
  if (!project.data) return error("That isn't a demo project.", 404);

  const ip = ipHash(req);
  const { count } = await supabase
    .from("flares")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ip)
    .eq("is_demo", true)
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  if ((count ?? 0) >= GUEST_FLARES_PER_IP_PER_HOUR) return error("Too many demo flares from this network. Try later.", 429);

  const guest = await guestWallet(true);
  if (!guest) return error("Couldn't start a guest session.", 500);
  const { night } = await currentDemoRun();
  // Per-run identity: demo projects are permanent, so a guest can back the
  // same project again in a later run.
  const wallet = `${guest}:${night}`;

  const inserted = await supabase.from("flares").insert({
    project_id: projectId,
    wallet,
    night,
    note,
    ip_hash: ip,
    is_demo: true,
    message: "demo guest flare (unsigned)",
    signature: "unsigned",
  });
  if (inserted.error) {
    if (inserted.error.message.includes("flare_limit") || inserted.error.message.includes("flares_wallet_night_slot")) {
      return error(`You've used all ${FLARES_PER_NIGHT} demo flares. Run dawn to see the report.`, 429);
    }
    if (inserted.error.code === "23505") return NextResponse.json({ ok: true, already: true });
    return error("Couldn't save the demo flare.", 500);
  }
  return NextResponse.json({ ok: true });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
