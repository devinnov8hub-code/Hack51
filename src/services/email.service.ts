import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = `${process.env.RESEND_FROM_NAME ?? "Hack51"} <${
  process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
}>`;

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:24px}
    .card{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .logo{font-size:22px;font-weight:700;color:#1a1a2e;margin-bottom:32px}
    h2{margin:0 0 12px;font-size:20px;color:#1a1a2e}
    p{margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6}
    .otp{letter-spacing:8px;font-size:36px;font-weight:700;color:#1a1a2e;background:#f4f4f5;border-radius:8px;padding:16px 24px;text-align:center;margin:24px 0}
    .footer{margin-top:32px;font-size:12px;color:#a1a1aa}
    .badge{display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:6px;padding:2px 10px;font-size:13px;font-weight:600;margin-bottom:16px}
  </style></head>
  <body><div class="card"><div class="logo">Hack51 ⚡</div>${body}
  <div class="footer">If you didn't request this, please ignore this email or contact support.</div>
  </div></body></html>`;
}

export async function sendEmailVerificationOtp(to: string, firstName: string, otp: string): Promise<void> {
  const body = `<span class="badge">Email Verification</span>
    <h2>Verify your email address</h2>
    <p>Hi ${firstName || "there"}, welcome to Hack51! Use the code below to verify your email. Expires in <strong>10 minutes</strong>.</p>
    <div class="otp">${otp}</div>
    <p>Enter this code in the app to complete your registration.</p>`;
  await resend.emails.send({ from: FROM, to, subject: `${otp} is your Hack51 verification code`, html: emailWrapper("Verify your email – Hack51", body) });
}

export async function sendWelcomeEmail(to: string, firstName: string, role: string): Promise<void> {
  const roleLabel = role === "employer" ? "Employer" : role === "candidate" ? "Candidate" : "Team member";
  const body = `<span class="badge">Welcome</span>
    <h2>Your account is verified 🎉</h2>
    <p>Hi ${firstName || "there"}, your Hack51 account is now active. You're registered as a <strong>${roleLabel}</strong>.</p>`;
  await resend.emails.send({ from: FROM, to, subject: "Welcome to Hack51 – you're all set!", html: emailWrapper("Welcome to Hack51", body) });
}

export async function sendPasswordResetOtp(to: string, firstName: string, otp: string): Promise<void> {
  const body = `<span class="badge">Password Reset</span>
    <h2>Reset your password</h2>
    <p>Hi ${firstName || "there"}, use the code below to reset your password. Expires in <strong>10 minutes</strong>.</p>
    <div class="otp">${otp}</div>
    <p>If you didn't request this, ignore this email. Your password will not change.</p>`;
  await resend.emails.send({ from: FROM, to, subject: `${otp} is your Hack51 password reset code`, html: emailWrapper("Password Reset – Hack51", body) });
}

export async function sendNewSignInNotification(
  to: string, firstName: string,
  meta: { ip?: string; userAgent?: string; timestamp: string }
): Promise<void> {
  const body = `<span class="badge">Security Alert</span>
    <h2>New sign-in detected</h2>
    <p>Hi ${firstName || "there"}, a new sign-in was detected on your Hack51 account.</p>
    <p><strong>Time:</strong> ${meta.timestamp}<br/>
    ${meta.ip ? `<strong>IP:</strong> ${meta.ip}<br/>` : ""}
    ${meta.userAgent ? `<strong>Device:</strong> ${meta.userAgent}` : ""}</p>
    <p>If this wasn't you, reset your password immediately.</p>`;
  await resend.emails.send({ from: FROM, to, subject: "New sign-in to your Hack51 account", html: emailWrapper("New Sign-In – Hack51", body) });
}

export async function sendPasswordChangedNotification(to: string, firstName: string): Promise<void> {
  const body = `<span class="badge">Security</span>
    <h2>Your password has been changed</h2>
    <p>Hi ${firstName || "there"}, your Hack51 account password was successfully changed.</p>
    <p>If you did <strong>not</strong> make this change, contact support immediately.</p>`;
  await resend.emails.send({ from: FROM, to, subject: "Your Hack51 password was changed", html: emailWrapper("Password Changed – Hack51", body) });
}
