import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { claimFields, isDecision, verifySnippet, type ClaimAction } from "@/lib/claims";
import { fetchHtml } from "@/lib/fetchPage";
import { isEnvelope } from "@/lib/signing";
import { db } from "@/lib/supabase";
import { verifySigned } from "@/lib/verify";

const CLAIM_HOLD_MS = 24 * 60 * 60 * 1000;

// POST { step, projectId, address, signature, envelope, decision? }
//   step "claim":  start a claim; returns a code to add to the project's site
//   step "verify": check the site for the code; marks the claim verified
//   step "decide": the verified founder sets raise / keep_building / need_testers
// Every step is signed by the founder's wallet.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { step, projectId, address, signature, decision, envelope } = body ?? {};
  if (
    !["claim", "verify", "decide"].includes(step) ||
    typeof projectId !== "string" ||
    typeof address !== "string" ||
    typeof signature !== "string" ||
    !isEnvelope(envelope)
  ) {
    return error("Missing or invalid fields.", 400);
  }
  if (step === "decide" && !isDecision(decision)) return error("Unknown decision.", 400);

  const action: ClaimAction = step === "decide" ? `decide:${decision}` : step;
  const wallet = address.toLowerCase();
  const signed = await verifySigned(req, action, claimFields(projectId), address, signature, envelope);
  if (!signed.ok) return error(signed.error, signed.status);

  const supabase = db();
  const project = await supabase
    .from("projects")
    .select("id, url")
    .eq("id", projectId)
    .eq("is_demo", false)
    .maybeSingle();
  if (!project.data) return error("Project not found.", 404);

  const existing = await supabase.from("claims").select("*").eq("project_id", projectId).maybeSingle();
  const claim = existing.data;

  if (step === "claim") {
    if (claim?.verified && claim.founder_wallet !== wallet) {
      return error("This project has already been claimed by its founder.", 409);
    }
    if (claim?.verified) return NextResponse.json({ ok: true, verified: true });
    if (claim && claim.founder_wallet === wallet) {
      return NextResponse.json({ ok: true, code: claim.verify_code, snippet: verifySnippet(claim.verify_code) });
    }
    // Someone else started a claim recently: give them a day to finish it.
    if (claim && Date.now() - new Date(claim.updated_at).getTime() < CLAIM_HOLD_MS) {
      return error("Someone else is claiming this project. Try again in 24 hours.", 409);
    }
    const code = `ns-${randomBytes(6).toString("hex")}`;
    const saved = await supabase.from("claims").upsert({
      project_id: projectId,
      founder_wallet: wallet,
      verify_code: code,
      verified: false,
      decision: null,
      updated_at: new Date().toISOString(),
    });
    if (saved.error) return error("Couldn't start the claim.", 500);
    return NextResponse.json({ ok: true, code, snippet: verifySnippet(code) });
  }

  if (!claim || claim.founder_wallet !== wallet) {
    return error("Start a claim with this wallet first.", 403);
  }

  if (step === "verify") {
    if (claim.verified) return NextResponse.json({ ok: true, verified: true });
    let html: string;
    try {
      html = (await fetchHtml(project.data.url)).html;
    } catch {
      return error("Couldn't load your site. Check it's live and public.", 422);
    }
    if (!html.includes(claim.verify_code)) {
      return error("Code not found on your site yet. Deploy the change, then try again.", 422);
    }
    const saved = await supabase
      .from("claims")
      .update({ verified: true, updated_at: new Date().toISOString() })
      .eq("project_id", projectId);
    if (saved.error) return error("Couldn't save the claim.", 500);
    return NextResponse.json({ ok: true, verified: true });
  }

  if (!claim.verified) return error("Verify your site before choosing what happens next.", 403);
  const saved = await supabase
    .from("claims")
    .update({ decision, updated_at: new Date().toISOString() })
    .eq("project_id", projectId);
  if (saved.error) return error("Couldn't save your decision.", 500);
  return NextResponse.json({ ok: true, decision });
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
