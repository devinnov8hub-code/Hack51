import type { Context } from "hono";
import * as authService from "../services/auth.service.js";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import type {
  RegisterInput, VerifyOtpInput, LoginInput,
  ForgotPasswordInput, VerifyResetOtpInput, ResetPasswordInput,
  RefreshTokenInput, LogoutInput,
} from "../dto/auth.dto.js";

function getRequestMeta(c: Context) {
  return {
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("cf-connecting-ip"),
    userAgent: c.req.header("user-agent"),
  };
}

export const AuthController = {
  async register(c: Context) {
    const body = getBody<RegisterInput>(c);
    const result = await authService.registerUser(body);
    return c.json(successResponse("Account created. Please check your email for a 6-digit verification code.", result), 201);
  },

  async verifyEmail(c: Context) {
    const body = getBody<VerifyOtpInput>(c);
    const result = await authService.verifyRegistrationOtp(body);
    return c.json(successResponse("Email verified successfully. Welcome to Hack51!", result));
  },

  async resendOtp(c: Context) {
    const body = getBody<{ email: string }>(c);
    const result = await authService.resendVerificationOtp(body.email);
    return c.json(successResponse(result.message, null));
  },

  async login(c: Context) {
    const body = getBody<LoginInput>(c);
    const result = await authService.loginUser({ email: body.email, password: body.password }, getRequestMeta(c));
    return c.json(successResponse("Login successful.", result));
  },

  async refresh(c: Context) {
    const body = getBody<RefreshTokenInput>(c);
    const result = await authService.refreshTokens(body.refresh_token);
    return c.json(successResponse("Tokens refreshed.", result));
  },

  async logout(c: Context) {
    const body = getBody<LogoutInput>(c);
    const result = await authService.logoutUser(body.refresh_token);
    return c.json(successResponse(result.message, null));
  },

  async forgotPassword(c: Context) {
    const body = getBody<ForgotPasswordInput>(c);
    const result = await authService.forgotPassword(body.email);
    return c.json(successResponse(result.message, null));
  },

  async verifyResetOtp(c: Context) {
    const body = getBody<VerifyResetOtpInput>(c);
    const result = await authService.verifyPasswordResetOtp(body);
    return c.json(successResponse("Code verified. Use the reset_token to set your new password.", result));
  },

  async resetPassword(c: Context) {
    const body = getBody<ResetPasswordInput>(c);
    const result = await authService.resetPassword(body);
    return c.json(successResponse(result.message, null));
  },

  async getMe(c: Context) {
    const userId = c.get("userId");
    const result = await authService.getMe(userId);
    return c.json(successResponse("Profile retrieved.", result));
  },
};
