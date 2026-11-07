// Loads data/seed.json into the demo edition (is_demo = true, never counted
// as real activity). Re-running updates existing demo rows by URL.
//
//   node --env-file=.env scripts/seed-demo.mjs
//
// Optional: SITE_URL (e.g. http://localhost:3000 or your Vercel URL) and
// CRON_SECRET in the environment to run the AI analyst on the seeded apps.
//
// seed.json is a list of { url, title, built_with, note }:
//   url         the app's live https:// address (real apps only, never invented)
//   title       its name
//   built_with  lovable | bolt | replit | v0 | cursor | claude-code | codex | other
//   note        a short curator note (max 140 chars), shown as its summary

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "data/seed.json");
const BUILT_WITH = ["lovable", "bolt", "replit", "v0", "cursor", "claude-code", "codex", "other"];

if (!existsSync(file)) {
  mkdirSync(dirname(file), { recursive: true });
  const example = [
    { url: "https://example.com/replace-with-a-real-app", title: "App name", built_with: "lovable", note: "One line on why it's worth a look (max 140 chars)." },
  ];
  writeFileSync(file, JSON.stringify(example, null, 2) + "\n");
  console.log(`Created ${file} with an example row.`);
  console.log("Replace it with real vibecoded apps (live https URLs you have permission to feature), then run this again.");
  process.exit(0);
}

const rows = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(rows)) throw new Error("data/seed.json must be a JSON array");

const problems = [];
const valid = rows.filter((r, i) => {
  let url;
  try {
    url = new URL(r.url);
  } catch {
    problems.push(`row ${i + 1}: url is not valid`);
    return false;
  }
  if (url.protocol !== "https:") problems.push(`row ${i + 1}: url must be https`);
  else if (/(^|\.)example\.(com|org|net)$/.test(url.hostname)) problems.push(`row ${i + 1}: still the example placeholder`);
  else if (!r.title || typeof r.title !== "string") problems.push(`row ${i + 1}: missing title`);
  else if (!BUILT_WITH.includes(r.built_with)) problems.push(`row ${i + 1}: built_with must be one of ${BUILT_WITH.join(", ")}`);
  else if (r.note && String(r.note).length > 140) problems.push(`row ${i + 1}: note is over 140 characters`);
  else return true;
  return false;
});
for (const p of problems) console.log("skip:", p);
if (valid.length === 0) {
  console.log("Nothing to seed. Fill data/seed.json with real apps and run again.");
  process.exit(0);
}

const supabase = createClient(new URL(process.env.SUPABASE_URL).origin, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

for (const r of valid) {
  const url = new URL(r.url);
  url.hash = "";
  const key = `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`.toLowerCase();
  const row = {
    url: url.toString(),
    url_key: key,
    title: r.title.slice(0, 80),
    summary: (r.note || "Demo project.").slice(0, 280),
    tags: [],
    built_with: r.built_with,
    scout_wallet: "guest:seed",
    night: "demo",
    is_demo: true,
  };
  const { error } = await supabase.from("projects").upsert(row, { onConflict: "url_key,night" });
  console.log(error ? `fail: ${r.title}: ${error.message}` : `ok: ${r.title}`);
}

const site = process.env.SITE_URL;
if (site && process.env.CRON_SECRET) {
  const res = await fetch(new URL("/api/demo/analyze", site), {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(70_000),
  }).catch((e) => ({ ok: false, statusText: e.message }));
  console.log("analyst:", res.ok ? await res.json() : `skipped (${res.statusText})`);
} else {
  console.log("Set SITE_URL and CRON_SECRET to also run the AI analyst on these apps.");
}
