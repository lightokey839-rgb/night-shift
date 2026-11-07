import { NextResponse } from "next/server";
import { analyzePage, saveAnalysis } from "@/lib/analyst";
import { fetchPage } from "@/lib/fetchPage";
import { currentNight, FLARES_PER_NIGHT, flareFields } from "@/lib/night";
import { isEnvelope } from "@/lib/signing";
import { cleanNote, isBlockedHost, isBuiltWith, normalizeUrl, NOTE_MAX } from "@/lib/submissions";
import { db } from "@/lib/supabase";
import { ipHash, verifySigned } from "@/lib/verify";

const HOUR_MS = 60 * 60 * 1000;
const NEW_PROJECTS_PER_WALLET_PER_HOUR = 5;
const NEW_PROJECTS_PER_IP_PER_HOUR = 10;
const FLARES_PER_IP_PER_HOUR = 30;

// POST { url, address, signature, night, note, builtWith, envelope }
// Flares a project for tonight with a signed note. If nobody has scouted the
// URL tonight, the page is checked, analysed, and added to the board.
// Flaring the same project twice is a no-op that returns ok.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { url, address, signature, night, builtWith, envelope } = body ?? {};
  if (typeof url !== "string" || typeof address !== "string" || typeof signature !== "string" || !isEnvelope(envelope)) {
    return error("Missing url, wallet, signature or nonce.", 400);
  }
  const note = cleanNote(body?.note);
  if (!note) return error(`Add a note on why you're backing it (up to ${NOTE_MAX} characters).`, 400);
  if (!isBuiltWith(builtWith)) return error("Pick what it was built with.", 400);

  const normalized = normalizeUrl(url);
  if (!normalized) return error("Use the app's full https:// address.", 400);
  if (isBlockedHost(new URL(normalized.url).hostname)) {
    return error("Night Shift is for indie vibecoded apps, not big platforms.", 422);
  }

  const tonight = currentNight();
  if (night !== tonight) return error("Dawn has passed. Refresh to scout tonight's board.", 409);

  const wallet = address.toLowerCase();
  const signed = await verifySigned(
    req,
    "flare",
    flareFields(normalized.url, tonight, note, builtWith),
    address,
    signature,
    envelope,
  );
  if (!signed.ok) return error(signed.error, signed.status);

  const supabase = db();
  const ip = ipHash(req);
  const since = new Date(Date.now() - HOUR_MS).toISOString();

  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("url_key", normalized.key)
    .eq("night", tonight)
    .eq("is_demo", false)
    .maybeSingle();

  if (project) {
    const already = await supabase
      .from("flares")
      .select("id")
      .eq("project_id", project.id)
      .eq("wallet", wallet)
      .maybeSingle();
    if (already.data) return NextResponse.json({ ok: true, projectId: project.id, already: true });
  }

  const [{ count: walletUsed }, { count: ipFlares }] = await Promise.all([
    supabase.from("flares").select("id", { count: "exact", head: true }).eq("wallet", wallet).eq("night", tonight),
    supabase.from("flares").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", since),
  ]);
  if ((walletUsed ?? 0) >= FLARES_PER_NIGHT) {
    return error(`You've used all ${FLARES_PER_NIGHT} flares tonight. Come back after dawn.`, 429);
  }
  if ((ipFlares ?? 0) >= FLARES_PER_IP_PER_HOUR) return error("Too many flares from this network. Try later.", 429);

  if (!project) {
    const [{ count: walletNew }, { count: ipNew }] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("scout_wallet", wallet).gte("created_at", since),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("scout_ip_hash", ip).gte("created_at", since),
    ]);
    if ((walletNew ?? 0) >= NEW_PROJECTS_PER_WALLET_PER_HOUR || (ipNew ?? 0) >= NEW_PROJECTS_PER_IP_PER_HOUR) {
      return error("You're adding projects too fast. Try again in an hour.", 429);
    }

    let page;
    try {
      page = await fetchPage(normalized.url);
    } catch (e) {
      console.error("scout fetch failed", e);
      return error("That page didn't load within 5 seconds over https. Check it's live and public.", 422);
    }
    const result = await analyzePage(normalized.url, page);

    const inserted = await supabase
      .from("projects")
      .insert({
        url: normalized.url,
        url_key: normalized.key,
        title: result.title,
        summary: result.summary,
        tags: result.tags,
        built_with: builtWith,
        scout_wallet: wallet,
        scout_ip_hash: ip,
        night: tonight,
      })
      .select("id")
      .single();

    if (inserted.error) {
      // Another scout added the same URL a moment ago; flare theirs instead.
      const existing = await supabase
        .from("projects")
        .select("id")
        .eq("url_key", normalized.key)
        .eq("night", tonight)
        .eq("is_demo", false)
        .single();
      if (existing.error) return error("Couldn't save the project.", 500);
      project = existing.data;
    } else {
      project = inserted.data;
      await saveAnalysis(project.id, result.analysis);
    }
  }

  const flare = await supabase.from("flares").insert({
    project_id: project.id,
    wallet,
    night: tonight,
    note,
    ip_hash: ip,
    message: signed.message,
    signature,
  });
  if (flare.error) {
    if (flare.error.message.includes("flare_limit") || flare.error.message.includes("flares_wallet_night_slot")) {
      return error(`You've used all ${FLARES_PER_NIGHT} flares tonight.`, 429);
    }
    if (flare.error.code === "23505") return NextResponse.json({ ok: true, projectId: project.id, already: true });
    return error("Couldn't save your flare.", 500);
  }

  return NextResponse.json({ ok: true, projectId: project.id });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
