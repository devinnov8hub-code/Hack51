/**
 * Auth Swagger doc definitions — shared across all roles.
 */
export const authDocs = {
  "/auth/register": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Register a new account (candidate or employer)",
      description: "Creates an unverified user. A 6-digit OTP is emailed immediately. Admin accounts cannot be self-registered.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" }, example: { email: "user@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } },
      responses: {
        201: { description: "Account created, OTP sent." },
        409: { description: "Email already exists (EMAIL_EXISTS)" },
        422: { description: "Validation error" },
        403: { description: "Admin self-registration is forbidden" },
      },
    },
  },
  "/auth/verify-email": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Verify email with 6-digit OTP",
      description: "Activates the account. Creates a workspace (employer) or candidate profile (candidate) on success. Sends a welcome email.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyOtpInput" }, example: { email: "user@example.com", otp: "482913" } } } },
      responses: { 200: { description: "Email verified" }, 400: { description: "Invalid or expired OTP (OTP_INVALID / OTP_EXPIRED)" }, 409: { description: "Already verified" } },
    },
  },
  "/auth/resend-otp": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Resend email verification OTP",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ResendOtpInput" }, example: { email: "user@example.com" } } } },
      responses: { 200: { description: "OTP resent" }, 409: { description: "Already verified" } },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Login (any verified role)",
      description: "Returns access + refresh tokens. Sends a security email on new IP detection.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" }, example: { email: "user@example.com", password: "SecurePass1!" } } } },
      responses: { 200: { description: "Tokens issued" }, 401: { description: "Invalid credentials" }, 403: { description: "Email not verified / account inactive" } },
    },
  },
  "/auth/refresh": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Rotate refresh token",
      description: "Issues a new token pair and revokes the old refresh token. Token reuse revokes ALL user sessions (theft detection).",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshTokenInput" }, example: { refresh_token: "eyJhbGci..." } } } },
      responses: { 200: { description: "New tokens issued" }, 401: { description: "Invalid or reused token" } },
    },
  },
  "/auth/logout": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Logout (revoke refresh token)",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LogoutInput" }, example: { refresh_token: "eyJhbGci..." } } } },
      responses: { 200: { description: "Logged out" } },
    },
  },
  "/auth/forgot-password": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Request password reset OTP",
      description: "Sends a 6-digit OTP to the email if registered. Always returns 200 to prevent enumeration.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ForgotPasswordInput" }, example: { email: "user@example.com" } } } },
      responses: { 200: { description: "Reset code sent (if registered)" } },
    },
  },
  "/auth/verify-reset-otp": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Verify password reset OTP → get reset_token",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/VerifyResetOtpInput" }, example: { email: "user@example.com", otp: "391045" } } } },
      responses: { 200: { description: "reset_token returned for use in /auth/reset-password" }, 400: { description: "Invalid or expired OTP" } },
    },
  },
  "/auth/reset-password": {
    post: {
      tags: ["Auth – Shared"],
      summary: "Complete password reset",
      description: "Uses the reset_token from the previous step. Revokes all sessions and sends a confirmation email.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ResetPasswordInput" }, example: { reset_token: "eyJhbGci...", new_password: "NewSecure1!" } } } },
      responses: { 200: { description: "Password reset" }, 401: { description: "Invalid reset token" } },
    },
  },
  "/auth/me": {
    get: {
      tags: ["Auth – Shared"],
      summary: "Get current authenticated user",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "User profile" }, 401: { description: "Unauthorized" } },
    },
  },
};
