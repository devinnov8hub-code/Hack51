import type { Context } from "hono";
import * as authService from "../services/auth.service.js";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
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
};
