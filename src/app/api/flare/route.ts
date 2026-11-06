import { NextResponse } from "next/server";
import { fetchPage } from "@/lib/fetchPage";
import { currentNight, FLARES_PER_NIGHT, flareMessage, normalizeUrl } from "@/lib/night";
import { summarizePage } from "@/lib/summarize";
import { db } from "@/lib/supabase";
import { verifyWalletSignature } from "@/lib/verify";

// POST { url, address, signature, night }
// Flares a project for tonight. If nobody has scouted the URL tonight, the page
// is fetched and summarised by Claude, and the project is added to the board.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { url, address, signature, night } = body ?? {};
  if (typeof url !== "string" || typeof address !== "string" || typeof signature !== "string") {
    return error("Missing url, address or signature.", 400);
  }

  const normalized = normalizeUrl(url);
  if (!normalized) return error("That doesn't look like a valid web address.", 400);

  // The client signs for the night it saw; reject if dawn passed in between.
  const tonight = currentNight();
  if (night !== tonight) return error("Dawn has passed. Refresh to scout tonight's board.", 409);

  const wallet = address.toLowerCase();
  const message = flareMessage(normalized.url, tonight, wallet);
  if (!(await verifyWalletSignature(address, message, signature))) {
    return error("Signature check failed.", 401);
  }

  const supabase = db();

  const { count } = await supabase
    .from("flares")
    .select("id", { count: "exact", head: true })
    .eq("wallet", wallet)
    .eq("night", tonight);
  if ((count ?? 0) >= FLARES_PER_NIGHT) {
    return error(`You've used all ${FLARES_PER_NIGHT} flares tonight. Come back after dawn.`, 429);
  }

  let { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("url_key", normalized.key)
    .eq("night", tonight)
    .maybeSingle();

  if (!project) {
    let page;
    try {
      page = await fetchPage(normalized.url);
    } catch (e) {
      console.error("scout fetch failed", e);
      return error("Couldn't read that page. Check the link is public and try again.", 422);
    }

    // If the AI summary is unavailable, fall back to the page's own title and
    // description so scouting never breaks because of it.
    let summary;
    try {
      summary = await summarizePage(normalized.url, page);
    } catch (e) {
      console.error("scout summary failed, using page metadata", e);
      summary = {
        title: (page.title || new URL(normalized.url).hostname).slice(0, 80),
        summary: (page.description || page.text).slice(0, 280) || "No description yet.",
        tags: [],
      };
    }

    const inserted = await supabase
      .from("projects")
      .insert({
        url: normalized.url,
        url_key: normalized.key,
        title: summary.title,
        summary: summary.summary,
        tags: summary.tags,
        scout_wallet: wallet,
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
        .single();
      if (existing.error) return error("Couldn't save the project.", 500);
      project = existing.data;
    } else {
      project = inserted.data;
    }
  }

  const flare = await supabase.from("flares").insert({
    project_id: project.id,
    wallet,
    night: tonight,
    message,
    signature,
  });
  if (flare.error) {
    if (flare.error.code === "23505") return error("You've already flared this project.", 409);
    if (flare.error.message.includes("flare_limit")) {
      return error(`You've used all ${FLARES_PER_NIGHT} flares tonight.`, 429);
    }
    return error("Couldn't save your flare.", 500);
  }

  return NextResponse.json({ ok: true, projectId: project.id });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
