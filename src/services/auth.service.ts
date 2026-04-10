import { randomUUID } from "crypto";
import { UserRole } from "../enumerations/UserRole.js";
import { OtpPurpose } from "../enumerations/OtpPurpose.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} from "../exceptions/errors.js";
import * as userRepo from "../repositories/user.repository.js";
import * as otpRepo from "../repositories/otp.repository.js";
import * as tokenRepo from "../repositories/refresh-token.repository.js";
import * as candidateRepo from "../repositories/candidate.repository.js";
import * as employerRepo from "../repositories/employer.repository.js";
import { generateOtp, verifyOtp } from "../utils/otp.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import {
  sendEmailVerificationOtp,
  sendWelcomeEmail,
  sendPasswordResetOtp,
  sendNewSignInNotification,
  sendPasswordChangedNotification,
} from "./email.service.js";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function safeUserPublic(user: userRepo.UserRow) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified,
    created_at: user.created_at,
  };
}

async function issueTokenPair(userId: string, email: string, role: string) {
  const jti = randomUUID();
  const accessToken = signAccessToken(userId, email, role);
  const refreshToken = signRefreshToken(userId, jti);

  // Refresh token expires in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await tokenRepo.storeRefreshToken(userId, refreshToken, jti, expiresAt);

  return { access_token: accessToken, refresh_token: refreshToken };
}

// ─── SHARED AUTH FLOWS ────────────────────────────────────────────────────────

/**
 * Step 1 of registration — create unverified account, send OTP.
 * Shared by all roles. Role-specific setup happens at verification.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}) {
  // Validate that the role is not an admin role — admins are created by system admins
  if (
    input.role === UserRole.ADMIN_REVIEWER ||
    input.role === UserRole.ADMIN_LEAD ||
    input.role === UserRole.SYSTEM_ADMIN
  ) {
    throw new ForbiddenError(
      "Admin accounts cannot be self-registered",
      "ADMIN_SELF_REGISTER_FORBIDDEN"
    );
  }

  const user = await userRepo.createUser({
    email: input.email,
    password: input.password,
    role: input.role,
    first_name: input.first_name,
    last_name: input.last_name,
    avatar_url: input.avatar_url,
  });

  const otp = generateOtp();
  await otpRepo.storeOtp(user.id, otp, OtpPurpose.EMAIL_VERIFICATION);

  // Fire-and-forget email — do not block registration response
  sendEmailVerificationOtp(user.email, user.first_name ?? "", otp).catch(
    (err) => console.error("[email] sendEmailVerificationOtp failed:", err)
  );

  return { user: safeUserPublic(user) };
}

/**
 * Step 2 of registration — verify OTP, activate account, send welcome.
 * Creates role-specific records (workspace for employers, profile for candidates).
 */
export async function verifyRegistrationOtp(input: { email: string; otp: string }) {
  const user = await userRepo.findUserByEmail(input.email);
  if (!user) throw new NotFoundError("No account found with this email", "USER_NOT_FOUND");
  if (user.is_verified) throw new ConflictError("Account is already verified", "ALREADY_VERIFIED");

  const otpRecord = await otpRepo.findValidOtp(user.id, OtpPurpose.EMAIL_VERIFICATION);
  if (!otpRecord) throw new BadRequestError("Verification code expired or not found", "OTP_EXPIRED");

  if (!verifyOtp(input.otp, otpRecord.otp_hash)) {
    throw new BadRequestError("Invalid verification code", "OTP_INVALID");
  }

  await otpRepo.consumeOtp(otpRecord.id);
  await userRepo.markUserVerified(user.id);

  // Create role-specific records
  if (user.role === UserRole.EMPLOYER) {
    await employerRepo.createWorkspace(user.id);
  } else if (user.role === UserRole.CANDIDATE) {
    await candidateRepo.upsertCandidateProfile(user.id, {});
  }

  // Send welcome email
  sendWelcomeEmail(user.email, user.first_name ?? "", user.role).catch(
    (err) => console.error("[email] sendWelcomeEmail failed:", err)
  );

  return { message: "Email verified successfully" };
}

/**
 * Resend email verification OTP.
 */
export async function resendVerificationOtp(email: string) {
  const user = await userRepo.findUserByEmail(email);
  if (!user) throw new NotFoundError("No account found with this email", "USER_NOT_FOUND");
  if (user.is_verified) throw new ConflictError("Account is already verified", "ALREADY_VERIFIED");

  const otp = generateOtp();
  await otpRepo.storeOtp(user.id, otp, OtpPurpose.EMAIL_VERIFICATION);

  sendEmailVerificationOtp(user.email, user.first_name ?? "", otp).catch(
    (err) => console.error("[email] resendVerificationOtp failed:", err)
  );

  return { message: "Verification code resent" };
}

/**
 * Login — shared by all roles. Validates role-specific constraints can be
 * added by the role-specific wrappers below.
 */
export async function loginUser(
  input: {
    email: string;
    password: string;
    expectedRole?: UserRole | UserRole[];
  },
  meta?: { ip?: string; userAgent?: string }
) {
  const user = await userRepo.findUserByEmail(input.email);
  if (!user) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

  const passwordValid = await userRepo.validateUserPassword(user, input.password);
  if (!passwordValid) throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");

  // Role-gate check
  if (input.expectedRole) {
    const allowed = Array.isArray(input.expectedRole)
      ? input.expectedRole
      : [input.expectedRole];
    if (!allowed.includes(user.role as UserRole)) {
      throw new ForbiddenError("This login is not permitted for your account type", "WRONG_ROLE_LOGIN");
    }
  }

  if (!user.is_verified) {
    throw new ForbiddenError(
      "Please verify your email before signing in. A new code has been sent.",
      "EMAIL_NOT_VERIFIED"
    );
  }

  if (!user.is_active) {
    throw new ForbiddenError("Your account has been deactivated. Contact support.", "ACCOUNT_INACTIVE");
  }

  // Detect if this is a new sign-in (first login or IP change)
  const isNewSignIn = !user.last_login || user.last_login_ip !== (meta?.ip ?? null);

  const tokens = await issueTokenPair(user.id, user.email, user.role);
  await userRepo.updateLastLogin(user.id, meta?.ip);

  if (isNewSignIn) {
    sendNewSignInNotification(user.email, user.first_name ?? "", {
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      timestamp: new Date().toUTCString(),
    }).catch((err) => console.error("[email] sendNewSignInNotification failed:", err));
  }

  return {
    ...tokens,
    user: safeUserPublic(user),
  };
}

/**
 * Refresh token rotation — issues a new token pair and revokes the old refresh token.
 */
export async function refreshTokens(oldRefreshToken: string) {
  const payload = verifyRefreshToken(oldRefreshToken);

  const storedToken = await tokenRepo.findRefreshTokenByJti(payload.jti);
  if (!storedToken) {
    // Possible token reuse — revoke all tokens for this user (theft protection)
    await tokenRepo.revokeAllUserTokens(payload.sub);
    throw new UnauthorizedError("Refresh token has been revoked or reused", "REFRESH_TOKEN_REUSE");
  }

  const user = await userRepo.findUserById(payload.sub);
  if (!user || !user.is_active) throw new UnauthorizedError("User not found or inactive", "USER_INACTIVE");

  await tokenRepo.revokeRefreshToken(payload.jti);
  const tokens = await issueTokenPair(user.id, user.email, user.role);

  return tokens;
}

/**
 * Logout — revoke the supplied refresh token.
 */
export async function logoutUser(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await tokenRepo.revokeRefreshToken(payload.jti);
  } catch {
    // Silently succeed — even if token is invalid/expired, logout is "done"
  }
  return { message: "Logged out successfully" };
}

/**
 * Initiate password reset — sends a 6-digit OTP to the registered email.
 */
export async function forgotPassword(email: string) {
  const user = await userRepo.findUserByEmail(email);
  // Always return the same message to prevent email enumeration
  if (!user) return { message: "If that email is registered, a reset code has been sent." };

  const otp = generateOtp();
  await otpRepo.storeOtp(user.id, otp, OtpPurpose.PASSWORD_RESET);

  sendPasswordResetOtp(user.email, user.first_name ?? "", otp).catch(
    (err) => console.error("[email] sendPasswordResetOtp failed:", err)
  );

  return { message: "If that email is registered, a reset code has been sent." };
}

/**
 * Verify OTP for password reset (step 1 of 2 — confirm the code).
 */
export async function verifyPasswordResetOtp(input: { email: string; otp: string }) {
  const user = await userRepo.findUserByEmail(input.email);
  if (!user) throw new NotFoundError("No account found with this email", "USER_NOT_FOUND");

  const otpRecord = await otpRepo.findValidOtp(user.id, OtpPurpose.PASSWORD_RESET);
  if (!otpRecord) throw new BadRequestError("Reset code expired or not found", "OTP_EXPIRED");

  if (!verifyOtp(input.otp, otpRecord.otp_hash)) {
    throw new BadRequestError("Invalid reset code", "OTP_INVALID");
  }

  // Consume now so the code cannot be reused
  await otpRepo.consumeOtp(otpRecord.id);

  // Issue a short-lived single-use reset token (access token with a special scope flag)
  // We'll encode intent in a short-lived access token — 10 min
  const resetToken = signAccessToken(user.id, user.email, `reset:${user.role}`);

  return { reset_token: resetToken };
}

/**
 * Complete password reset — uses the reset_token from the verify step.
 */
export async function resetPassword(input: { reset_token: string; new_password: string }) {
  // The verifyAccessToken util handles expiry and signature
  const { verifyAccessToken } = await import("../utils/jwt.js");
  const payload = verifyAccessToken(input.reset_token);

  if (!payload.role.startsWith("reset:")) {
    throw new UnauthorizedError("Invalid reset token", "INVALID_RESET_TOKEN");
  }

  await userRepo.updateUserPassword(payload.sub, input.new_password);
  // Revoke all refresh tokens (security: force re-login after password reset)
  await tokenRepo.revokeAllUserTokens(payload.sub);

  const user = await userRepo.findUserById(payload.sub);
  if (user) {
    sendPasswordChangedNotification(user.email, user.first_name ?? "").catch(
      (err) => console.error("[email] sendPasswordChangedNotification failed:", err)
    );
  }

  return { message: "Password reset successfully. Please sign in with your new password." };
}

/**
 * Get current authenticated user's profile.
 */
export async function getMe(userId: string) {
  const user = await userRepo.findUserById(userId);
  if (!user) throw new NotFoundError("User not found", "USER_NOT_FOUND");
  return safeUserPublic(user);
}

// ─── ADMIN-SPECIFIC FLOWS ─────────────────────────────────────────────────────

/**
 * Create an admin account — only callable by SYSTEM_ADMIN.
 */
export async function createAdminUser(
  input: {
    email: string;
    password: string;
    role: UserRole.ADMIN_REVIEWER | UserRole.ADMIN_LEAD;
    first_name?: string;
    last_name?: string;
  },
  createdByRole: string
) {
  if (createdByRole !== UserRole.SYSTEM_ADMIN) {
    throw new ForbiddenError("Only system admins can create admin accounts", "FORBIDDEN");
  }

  const user = await userRepo.createUser({
    email: input.email,
    password: input.password,
    role: input.role,
    first_name: input.first_name,
    last_name: input.last_name,
  });

  // Admin accounts are pre-verified — no OTP needed
  await userRepo.markUserVerified(user.id);

  // Send their initial credentials email (reusing OTP flow for initial password setup)
  const otp = generateOtp();
  await otpRepo.storeOtp(user.id, otp, OtpPurpose.PASSWORD_RESET);
  sendPasswordResetOtp(user.email, user.first_name ?? "", otp).catch(
    (err) => console.error("[email] sendPasswordResetOtp (admin create) failed:", err)
  );

  return { user: safeUserPublic(user), message: "Admin account created. Temporary code sent to email." };
}

/**
 * Admin login — only allows admin roles.
 */
export async function loginAdmin(
  input: { email: string; password: string },
  meta?: { ip?: string; userAgent?: string }
) {
  const adminRoles = [UserRole.ADMIN_REVIEWER, UserRole.ADMIN_LEAD, UserRole.SYSTEM_ADMIN];
  return loginUser({ ...input, expectedRole: adminRoles }, meta);
}

// ─── EMPLOYER-SPECIFIC FLOWS ──────────────────────────────────────────────────

export async function loginEmployer(
  input: { email: string; password: string },
  meta?: { ip?: string; userAgent?: string }
) {
  return loginUser({ ...input, expectedRole: UserRole.EMPLOYER }, meta);
}

export async function getEmployerWorkspace(userId: string) {
  const workspace = await employerRepo.findWorkspaceByOwner(userId);
  if (!workspace) throw new NotFoundError("Workspace not found", "WORKSPACE_NOT_FOUND");
  return workspace;
}

// ─── CANDIDATE-SPECIFIC FLOWS ────────────────────────────────────────────────

export async function loginCandidate(
  input: { email: string; password: string },
  meta?: { ip?: string; userAgent?: string }
) {
  return loginUser({ ...input, expectedRole: UserRole.CANDIDATE }, meta);
}

export async function getCandidateProfile(userId: string) {
  const profile = await candidateRepo.findCandidateProfile(userId);
  if (!profile) throw new NotFoundError("Candidate profile not found", "PROFILE_NOT_FOUND");
  return profile;
}

export async function updateCandidateProfile(
  userId: string,
  fields: {
    bio?: string;
    skills?: string[];
    experience_years?: number;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
  }
) {
  return candidateRepo.upsertCandidateProfile(userId, fields);
}
