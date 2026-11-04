import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side client. Uses the service role key, so it must never be imported
// into a client component.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export type Project = {
  id: string;
  url: string;
  title: string;
  summary: string;
  tags: string[];
  fundable_url: string | null;
  scout_wallet: string;
  night: string;
  created_at: string;
};
