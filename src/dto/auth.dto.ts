import { z } from "zod";
import { UserRole } from "../enumerations/UserRole.js";

// ─── Shared field definitions ────────────────────────────────────────────────
const emailField = z
  .string({ required_error: "Email is required" })
  .email("Must be a valid email address")
  .toLowerCase()
  .trim();

const passwordField = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const otpField = z
  .string({ required_error: "OTP code is required" })
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain only digits");

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: emailField,
  password: passwordField,
  role: z.enum([UserRole.CANDIDATE, UserRole.EMPLOYER], {
    required_error: "Role is required",
    message: "Role must be either 'candidate' or 'employer'",
  }),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url("Must be a valid URL").optional(),
});

export const VerifyOtpSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const ResendOtpSchema = z.object({
  email: emailField,
});

export const LoginSchema = z.object({
  email: emailField,
  password: z.string({ required_error: "Password is required" }).min(1),
});

export const ForgotPasswordSchema = z.object({
  email: emailField,
});

export const VerifyResetOtpSchema = z.object({
  email: emailField,
  otp: otpField,
});

export const ResetPasswordSchema = z.object({
  reset_token: z.string({ required_error: "Reset token is required" }).min(1),
  new_password: passwordField,
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string({ required_error: "Refresh token is required" }).min(1),
});

export const LogoutSchema = z.object({
  refresh_token: z.string({ required_error: "Refresh token is required" }).min(1),
});

// Admin-only schemas
export const CreateAdminSchema = z.object({
  email: emailField,
  password: passwordField,
  role: z.enum([UserRole.ADMIN_REVIEWER, UserRole.ADMIN_LEAD], {
    message: "Role must be admin_reviewer or admin_lead",
  }),
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
});

// Candidate profile update
export const UpdateCandidateProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string()).max(50).optional(),
  experience_years: z.number().int().min(0).max(50).optional(),
  location: z.string().max(200).optional(),
  linkedin_url: z.string().url().optional(),
  portfolio_url: z.string().url().optional(),
});

// Employer workspace update
export const UpdateWorkspaceSchema = z.object({
  company_name: z.string().min(1).max(255).optional(),
  company_url: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  team_size: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type VerifyResetOtpInput = z.infer<typeof VerifyResetOtpSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;
export type CreateAdminInput = z.infer<typeof CreateAdminSchema>;
export type UpdateCandidateProfileInput = z.infer<typeof UpdateCandidateProfileSchema>;
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceSchema>;
