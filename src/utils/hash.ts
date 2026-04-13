import bcrypt from "bcryptjs";

// bcrypt rounds: 10 is the industry standard for production (secure + fast enough).
// 12 rounds is ~4x slower than 10 and causes FUNCTION_INVOCATION_TIMEOUT on
// Vercel's throttled serverless CPU. Override via BCRYPT_ROUNDS in .env if needed.
const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? "10", 10);

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}
