import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
  );
}

// Validate URL format early — catch typos like missing https:// or trailing spaces
try {
  new URL(supabaseUrl);
} catch {
  throw new Error(
    `SUPABASE_URL is not a valid URL: "${supabaseUrl}"\n` +
    `   Expected format: https://your-project-ref.supabase.co`
  );
}

console.log(`[supabase] Connecting to: ${supabaseUrl}`);

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * Call this once at startup to verify the Supabase connection is healthy.
 * A failed ping means SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is wrong.
 */
export async function pingSupabase(): Promise<void> {
  // A lightweight query — just check the users table is reachable
  const { error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase connection failed: ${error.message}\n` +
      `   URL: ${supabaseUrl}\n` +
      `   Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env`
    );
  }
  console.log("[supabase] ✅ Connection verified");
}
