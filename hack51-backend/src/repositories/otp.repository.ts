import { supabase } from "../config/supabase.js";
import { hashOtp } from "../utils/otp.js";
import { InternalError } from "../exceptions/errors.js";
import { OtpPurpose } from "../enumerations/OtpPurpose.js";

export interface OtpRow {
  id: string;
  user_id: string;
  otp_hash: string;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

const OTP_TTL_MINUTES = parseInt(process.env.OTP_EXPIRES_MINUTES ?? "10", 10);

export async function storeOtp(userId: string, plainOtp: string, purpose: OtpPurpose): Promise<void> {
  // Invalidate any prior unused OTPs for the same user+purpose
  await supabase
    .from("otps")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("used_at", null);

  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase.from("otps").insert({
    user_id: userId,
    otp_hash: hashOtp(plainOtp),
    purpose,
    expires_at: expiresAt,
  });

  if (error) throw new InternalError(`Failed to store OTP: ${error.message}`);
}

export async function findValidOtp(userId: string, purpose: OtpPurpose): Promise<OtpRow | null> {
  const { data, error } = await supabase
    .from("otps")
    .select("*")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new InternalError(`DB error: ${error.message}`);
  return data as OtpRow;
}

export async function consumeOtp(otpId: string): Promise<void> {
  const { error } = await supabase
    .from("otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", otpId);
  if (error) throw new InternalError(`Failed to consume OTP: ${error.message}`);
}
