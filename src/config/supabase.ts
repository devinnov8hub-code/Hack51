import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "dotenv/config";

// Lazy singleton — created on first use, not at module load.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables."
    );
  }

  try {
    new URL(supabaseUrl);
  } catch {
    throw new Error(
      `SUPABASE_URL is not a valid URL: "${supabaseUrl}"\n` +
      `   Expected format: https://your-project-ref.supabase.co`
    );
  }

  console.log(`[supabase] Connecting to: ${supabaseUrl}`);

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export async function pingSupabase(): Promise<void> {
  const { error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    throw new Error(
      `Supabase connection failed: ${error.message}\n` +
      `   URL: ${process.env.SUPABASE_URL}\n` +
      `   Check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env`
    );
  }
  console.log("[supabase] ✅ Connection verified");
}