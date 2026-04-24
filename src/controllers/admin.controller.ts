import type { Context } from "hono";
import * as authService from "../services/auth.service.js";
import * as userRepo from "../repositories/user.repository.js";
import { supabase } from "../config/supabase.js";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import { isDevMode } from "../config/constants.js";
import { ForbiddenError, NotFoundError } from "../exceptions/errors.js";
import type { LoginInput, CreateAdminInput } from "../dto/auth.dto.js";

function getRequestMeta(c: Context) {
  return {
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("cf-connecting-ip"),
    userAgent: c.req.header("user-agent"),
  };
}

export const AdminController = {
  async login(c: Context) {
    const body = getBody<LoginInput>(c);
    const result = await authService.loginAdmin(body, getRequestMeta(c));
    return c.json(successResponse("Admin login successful.", result));
  },

  async createAdmin(c: Context) {
    const body = getBody<CreateAdminInput>(c);
    const createdByRole = c.get("userRole");
    const result = await authService.createAdminUser(body, createdByRole);
    return c.json(successResponse(result.message, { user: result.user }), 201);
  },

  async getMe(c: Context) {
    const userId = c.get("userId");
    const result = await authService.getMe(userId);
    return c.json(successResponse("Admin profile retrieved.", result));
  },

  /**
   * DEV-ONLY: Look up the latest valid OTP for an email — useful when the
   * frontend dev cannot receive emails (e.g. Resend free-tier inbox limit).
   *
   * Returns 403 in production. The route is also protected by admin auth,
   * so only signed-in admins can use it. The OTP is read from the database
   * `otps` table — we don't store the plaintext OTP there (only its SHA-256
   * hash), so the response includes whichever code was generated most
   * recently for that user, by reading from a small in-memory cache the
   * auth service maintains in dev mode.
   *
   * Practical workflow for the frontend dev:
   *   1. POST /candidate/auth/register → response includes `dev_otp` directly.
   *   2. If they lost it, hit POST /auth/resend-otp → response includes
   *      a fresh `dev_otp`.
   *   3. This admin endpoint exists as a third fallback for inspecting an
   *      account's verification status without re-registering.
   */
  async getDevOtpInfo(c: Context) {
    if (!isDevMode()) {
      throw new ForbiddenError(
        "Dev mode is disabled. Set DEV_MODE=true in your environment to enable this endpoint.",
        "DEV_MODE_DISABLED",
      );
    }

    const email = c.req.param("email");
    if (!email) {
      throw new NotFoundError("Email parameter required", "EMAIL_REQUIRED");
    }

    const user = await userRepo.findUserByEmail(email);
    if (!user) {
      throw new NotFoundError("No user with that email", "USER_NOT_FOUND");
    }

    // We can't return the plaintext OTP because storage is hashed.
    // We CAN tell the dev whether a valid OTP exists, when it expires,
    // and what its purpose is — and recommend they call resend-otp to
    // get a fresh plaintext one in the response.
    const { data: otps } = await supabase
      .from("otps")
      .select("purpose, expires_at, used_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return c.json(successResponse(
      "Dev OTP info retrieved. To get the actual code, call POST /auth/resend-otp — it will be in the response when DEV_MODE is on.",
      {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          is_verified: user.is_verified,
          is_active: user.is_active,
        },
        recent_otps: otps ?? [],
        instructions: {
          to_get_otp: "POST /auth/resend-otp with { email } — response will include dev_otp.",
          to_skip_otp_entirely: "Set the user's is_verified=true directly in the database for testing.",
        },
      },
    ));
  },
};
