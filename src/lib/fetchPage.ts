import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5_000;

// Refuse addresses that point back into private networks, so a submitted URL
// can't be used to make the server request internal services.
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === "::1" || v6 === "::") return true;
    if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")) return true;
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

async function assertPublicHost(url: URL) {
  if (url.protocol !== "https:") throw new Error("not_https");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("private_host");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error("private_host");
}

export type FetchedPage = { html: string; finalUrl: string; ms: number };

// Raw HTML of a public https page. Follows up to MAX_REDIRECTS redirects,
// re-checking each hop against private addresses, and gives up after
// TIMEOUT_MS in total (body included) or MAX_BYTES of HTML.
export async function fetchHtml(input: string): Promise<FetchedPage> {
  const started = Date.now();
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let url = new URL(input);
  let res: Response | null = null;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    res = await fetch(url, {
      redirect: "manual",
      signal,
      cache: "no-store",
      headers: { "user-agent": "NightShiftBot/0.2 (+https://night-shift-nine-rho.vercel.app)", accept: "text/html" },
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error("fetch_failed");

  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
    if (size >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return { html: new TextDecoder().decode(Buffer.concat(chunks)), finalUrl: url.toString(), ms: Date.now() - started };
}

// Cheap facts about the page, used by the AI analyst and shown as-is.
export type SiteChecks = {
  loads: boolean;
  https: boolean;
  responseMs: number;
  hasTitle: boolean;
  hasDescription: boolean;
  hasOgImage: boolean;
  mobileViewport: boolean;
  hasLang: boolean;
  imagesWithAlt: number | null; // share of <img> tags with alt text, 0-100
};

export type PageInfo = { title: string; description: string; text: string; checks: SiteChecks };

export async function fetchPage(input: string): Promise<PageInfo> {
  const { html, finalUrl, ms } = await fetchHtml(input);

  const pick = (re: RegExp) => decode(html.match(re)?.[1]?.trim() ?? "");
  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
    pick(/<title[^>]*>([^<]*)<\/title>/i);
  const description =
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  )
    .trim()
    .slice(0, 6_000);

  const images = html.match(/<img\b[^>]*>/gi) ?? [];
  const withAlt = images.filter((tag) => /\balt=["'][^"']+["']/i.test(tag)).length;

  return {
    title: title.slice(0, 120),
    description: description.slice(0, 400),
    text,
    checks: {
      loads: true,
      https: finalUrl.startsWith("https:"),
      responseMs: ms,
      hasTitle: Boolean(title),
      hasDescription: Boolean(description),
      hasOgImage: /<meta[^>]+property=["']og:image["']/i.test(html),
      mobileViewport: /<meta[^>]+name=["']viewport["'][^>]+width=device-width/i.test(html),
      hasLang: /<html[^>]+\blang=["'][^"']+["']/i.test(html),
      imagesWithAlt: images.length ? Math.round((withAlt / images.length) * 100) : null,
    },
  };
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
