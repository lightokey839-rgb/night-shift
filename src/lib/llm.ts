import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// One structured-JSON call to whichever model is configured:
//   GROQ_API_KEY set      -> Groq (free tier), model GROQ_MODEL
//   else ANTHROPIC_API_KEY -> Claude Haiku
//   else                  -> null, and callers use their non-AI fallback
// Never throws; returns null on any failure or timeout.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

export function aiProvider(): "groq" | "anthropic" | null {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function generateJson<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  // Plain-English shape of the JSON, for models without native schema output.
  shape: string;
  timeoutMs: number;
}): Promise<z.infer<T> | null> {
  const provider = aiProvider();
  try {
    if (provider === "groq") return await groqJson(opts);
    if (provider === "anthropic") return await claudeJson(opts);
  } catch (e) {
    console.error(`${provider} call failed`, e);
  }
  return null;
}

async function groqJson<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  shape: string;
  timeoutMs: number;
}): Promise<z.infer<T> | null> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    signal: AbortSignal.timeout(opts.timeoutMs),
    headers: { authorization: `Bearer ${process.env.GROQ_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
      temperature: 0.3,
      // Room for reasoning models (gpt-oss) to think before the JSON.
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${opts.system}\n\nRespond with a single JSON object only, in this shape:\n${opts.shape}` },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    console.error("groq error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const data = await res.json();
  const text: unknown = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") return null;
  const parsed = opts.schema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    console.error("groq output did not match schema", parsed.error.issues.slice(0, 3));
    return null;
  }
  return parsed.data;
}

async function claudeJson<T extends z.ZodType>(opts: {
  system: string;
  user: string;
  schema: T;
  timeoutMs: number;
}): Promise<z.infer<T> | null> {
  const client = new Anthropic({ timeout: opts.timeoutMs, maxRetries: 0 });
  const response = await client.messages.parse({
    model: "claude-haiku-5-5",
    max_tokens: 16000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: "low", format: zodOutputFormat(opts.schema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) return null;
  return response.parsed_output as z.infer<T>;
}
