import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";
import { createHash, randomUUID } from "crypto";

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  jti: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function storeRefreshToken(
  userId: string,
  token: string,
  jti: string,
  expiresAt: Date
): Promise<void> {
  const { error } = await supabase.from("refresh_tokens").insert({
    user_id: userId,
    token_hash: hashToken(token),
    jti,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new InternalError(`Failed to store refresh token: ${error.message}`);
}

export async function findRefreshTokenByJti(jti: string): Promise<RefreshTokenRow | null> {
  const { data, error } = await supabase
    .from("refresh_tokens")
    .select("*")
    .eq("jti", jti)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new InternalError(`DB error: ${error.message}`);
  return data as RefreshTokenRow;
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  const { error } = await supabase
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("jti", jti);
  if (error) throw new InternalError(`Failed to revoke token: ${error.message}`);
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from("refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
  if (error) throw new InternalError(`Failed to revoke all tokens: ${error.message}`);
}
