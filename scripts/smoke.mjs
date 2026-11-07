// End-to-end smoke test against a local dev server (`npm run dev`).
//
//   node --env-file=.env scripts/smoke.mjs [http://localhost:3000]
//
// Runs on a far-future night (2030) via the dev-only clock, so nothing shows
// on the real board, and deletes everything it created at the end.
// Covers: load, connect (in-memory wallets), submit, validation, replay,
// idempotent flare, 3-flare limit, board update, dawn, Morning Report, and
// the demo edition's guest flare + "Run dawn now".

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DOMAIN = new URL(BASE).host;
const APP = "https://night-shift-nine-rho.vercel.app"; // a real vibecoded app: this one
const NIGHT = "2030-01-02";

const supabase = createClient(new URL(process.env.SUPABASE_URL).origin, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const envelope = (offsetMs = 0) => {
  const now = Date.now() + offsetMs;
  return {
    nonce: [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join(""),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  };
};
// Mirrors src/lib/signing.ts + flareFields in src/lib/night.ts.
const message = (url, note, builtWith, wallet, env, domain = DOMAIN) =>
  [
    "Night Shift · flare",
    `Project: ${url}`,
    `Night: ${NIGHT}`,
    `Built with: ${builtWith}`,
    `Note: ${note}`,
    `Wallet: ${wallet.toLowerCase()}`,
    `Domain: ${domain}`,
    `Nonce: ${env.nonce}`,
    `Issued: ${env.issuedAt}`,
    `Expires: ${env.expiresAt}`,
  ].join("\n");

async function flare(account, { url, note = "Smoke test note", builtWith = "claude-code", env = envelope(), domain, signature } = {}) {
  const sig = signature ?? (await account.signMessage({ message: message(url, note, builtWith, account.address, env, domain) }));
  const res = await fetch(`${BASE}/api/flare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, address: account.address, signature: sig, night: NIGHT, note, builtWith, envelope: env }),
  });
  return { status: res.status, body: await res.json().catch(() => null), sig, env };
}

const clock = (now) =>
  fetch(`${BASE}/api/dev/clock`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ now }) });

const a = privateKeyToAccount(generatePrivateKey());
const b = privateKeyToAccount(generatePrivateKey());
let demoProjectId = null;

try {
  const home = await fetch(BASE);
  check("homepage loads", home.ok, `${home.status}`);

  // Wake the target app first: submissions must load within 5s, and a cold
  // serverless start can take longer than that.
  await Promise.all(
    ["/", "/report", "/scout/0x638f06eb67289d36133f7c3607197f94e0a459fb", "/scout/0x0000000000000000000000000000000000000001"].map(
      (p) => fetch(`${APP}${p}`).catch(() => {}),
    ),
  );

  const c = await clock("2030-01-01T12:00:00Z");
  check("dev clock set to the night of 2030-01-02", c.ok);

  // Submit + flare
  const first = await flare(a, { url: `${APP}/`, note: "Scouts finding apps overnight, signed by wallet." });
  check("scout submits a new app with a note", first.status === 200 && first.body?.ok, JSON.stringify(first.body));
  const projectId = first.body?.projectId;

  const replay = await flare(a, { url: `${APP}/`, env: first.env, signature: first.sig, note: "Scouts finding apps overnight, signed by wallet." });
  check("replaying the same signature is refused", replay.status === 409, `${replay.status}`);

  const second = await flare(b, { url: `${APP}/`, note: "Love the dawn lock." });
  check("second scout flares the same app", second.status === 200 && second.body?.projectId === projectId);
  const again = await flare(b, { url: `${APP}/`, note: "Love the dawn lock." });
  check("flaring twice is idempotent", again.status === 200 && again.body?.already === true);

  // Validation
  check("http:// is refused", (await flare(a, { url: "http://example.org/" })).status === 400);
  check("big platforms are refused", (await flare(a, { url: "https://chatgpt.com/" })).status === 422);
  check("a note is required", (await flare(a, { url: `${APP}/demo`, note: "" })).status === 400);
  check("built-with is required", (await flare(a, { url: `${APP}/demo`, builtWith: "" })).status === 400);
  check("an expired signature is refused", (await flare(a, { url: `${APP}/demo`, env: envelope(-11 * 60 * 1000) })).status === 401);
  check("a signature for another domain is refused", (await flare(a, { url: `${APP}/demo`, domain: "evil.example" })).status === 401);

  // 3 flares per night: a has 1, two more succeed, the 4th is refused.
  const f2 = await flare(a, { url: `${APP}/report` });
  const f3 = await flare(a, { url: `${APP}/scout/0x638f06eb67289d36133f7c3607197f94e0a459fb` });
  const f4 = await flare(a, { url: `${APP}/scout/0x0000000000000000000000000000000000000001` });
  check("scout can use flares 2 and 3", f2.status === 200 && f3.status === 200, `${f2.status}, ${f3.status}`);
  check("the 4th flare of the night is refused", f4.status === 429, `${f4.status}`);

  const board = await (await fetch(BASE)).text();
  check("board shows the project and its note", board.includes("Scouts finding apps overnight, signed by wallet."));

  // Dawn
  await clock("2030-01-02T07:00:00Z");
  if (process.env.CRON_SECRET) {
    const dawn = await fetch(`${BASE}/api/dawn?night=${NIGHT}`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const body = await dawn.json().catch(() => null);
    check("dawn job publishes the report", dawn.ok && body?.published === true, JSON.stringify(body));
    const twice = await fetch(`${BASE}/api/dawn?night=${NIGHT}`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    check("dawn job is safe to run twice", twice.ok);
  } else {
    console.log("SKIP  dawn job (set CRON_SECRET in .env to test it)");
  }
  const report = await (await fetch(`${BASE}/report/${NIGHT}`)).text();
  check("Morning Report shows the project", report.includes("Night Shift") && report.includes("Love the dawn lock."));
  check("Morning Report ranks it first with 2 flares", /The top/.test(report));

  const late = await flare(b, { url: `${APP}/demo` });
  check("flares for a locked night are refused", late.status === 409, `${late.status}`);

  // Demo edition
  const demoProject = await supabase
    .from("projects")
    .insert({ url: `${APP}/?smoke`, url_key: `smoke-${Date.now()}`, title: "Smoke demo app", summary: "Temporary.", tags: [], scout_wallet: "guest:seed", night: "demo", is_demo: true, built_with: "claude-code" })
    .select("id")
    .single();
  demoProjectId = demoProject.data?.id;
  const guest = await fetch(`${BASE}/api/demo/flare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId: demoProjectId, note: "Guest flare from the smoke test" }),
  });
  check("guest can flare a demo project without a wallet", guest.ok, `${guest.status}`);
  const realAsGuest = await fetch(`${BASE}/api/demo/flare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId, note: "nope" }),
  });
  check("guests can't flare real projects", realAsGuest.status === 404, `${realAsGuest.status}`);

  const started = Date.now();
  const dawn = await fetch(`${BASE}/api/demo/dawn`, { method: "POST" });
  const dawnBody = await dawn.json().catch(() => null);
  if (dawn.status === 429) {
    console.log("SKIP  demo dawn (someone ran it in the last 30s)");
  } else {
    const ms = Date.now() - started;
    check("Run dawn now finishes in under 10s", dawn.ok && ms < 10_000, `${ms} ms`);
    const demoReport = await (await fetch(`${BASE}${dawnBody?.report}`)).text();
    check("demo report shows the guest's note and a Demo badge", demoReport.includes("Guest flare from the smoke test") && demoReport.includes("Demo"));
    const homeAfter = await (await fetch(BASE)).text();
    check("demo activity never appears on the real board", !homeAfter.includes("Smoke demo app"));
  }
} finally {
  await clock(null).catch(() => {});
  const { data: mine } = await supabase.from("projects").select("id").eq("night", NIGHT);
  const ids = (mine ?? []).map((p) => p.id);
  if (demoProjectId) ids.push(demoProjectId);
  if (ids.length) await supabase.from("projects").delete().in("id", ids);
  await supabase.from("reports").delete().eq("night", NIGHT);
  console.log(`cleanup: removed ${ids.length} test projects`);
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
