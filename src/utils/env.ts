import "dotenv/config";

const required = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
];

const optional = [
  "PAYSTACK_SECRET_KEY",        // Paystack integration (not yet active)
  "PAYSTACK_WEBHOOK_SECRET",    // Paystack webhook verification
  "FRONTEND_URL",
  "PORT",
  "BCRYPT_ROUNDS",
  "OTP_EXPIRES_MINUTES",
];

export function validateEnv(): void {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `\n❌ Missing required environment variables:\n` +
      missing.map((k) => `   - ${k}`).join("\n") +
      `\n\nCopy .env.example to .env and fill in the values.\n`
    );
  }

  const missingOptional = optional.filter((key) => !process.env[key]);
  if (missingOptional.length > 0) {
    console.warn(
      `[env] Optional vars not set (OK for now): ${missingOptional.join(", ")}`
    );
  }
}
