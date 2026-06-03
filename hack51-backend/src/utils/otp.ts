import { createHash, randomInt } from "crypto";

/**
 * Generate a cryptographically random 6-digit OTP.
 */
export function generateOtp(): string {
  // randomInt(min, max) is exclusive of max, so 100000–999999 inclusive
  return randomInt(100000, 1000000).toString();
}

/**
 * Hash an OTP before storing in DB (never store plain OTPs).
 */
export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

/**
 * Constant-time comparison of an incoming OTP against the stored hash.
 */
export function verifyOtp(plain: string, storedHash: string): boolean {
  const incomingHash = hashOtp(plain);
  // Use timingSafeEqual via Buffer to prevent timing attacks
  const a = Buffer.from(incomingHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
