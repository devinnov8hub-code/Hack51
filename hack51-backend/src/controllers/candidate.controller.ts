import type { Context } from "hono";
import * as authService from "../services/auth.service.js";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import type { RegisterInput, LoginInput, UpdateCandidateProfileInput } from "../dto/auth.dto.js";
import { UserRole } from "../enumerations/UserRole.js";

function getRequestMeta(c: Context) {
  return {
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: c.req.header("user-agent"),
  };
}

export const CandidateController = {
  async register(c: Context) {
    const body = getBody<RegisterInput>(c);
    const result = await authService.registerUser({ ...body, role: UserRole.CANDIDATE });
    return c.json(successResponse("Candidate account created. Check your email for a verification code.", result), 201);
  },

  async login(c: Context) {
    const body = getBody<LoginInput>(c);
    const result = await authService.loginCandidate(body, getRequestMeta(c));
    return c.json(successResponse("Candidate login successful.", result));
  },

  async getProfile(c: Context) {
    const userId = c.get("userId");
    const profile = await authService.getCandidateProfile(userId);
    return c.json(successResponse("Candidate profile retrieved.", profile));
  },

  async updateProfile(c: Context) {
    const userId = c.get("userId");
    const body = getBody<UpdateCandidateProfileInput>(c);
    const profile = await authService.updateCandidateProfile(userId, body);
    return c.json(successResponse("Profile updated.", profile));
  },
};
