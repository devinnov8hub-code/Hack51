import type { Context } from "hono";
import * as authService from "../services/auth.service.js";
import * as employerRepo from "../repositories/employer.repository.js";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import type { RegisterInput, LoginInput, UpdateWorkspaceInput } from "../dto/auth.dto.js";
import { UserRole } from "../enumerations/UserRole.js";
import { NotFoundError } from "../exceptions/errors.js";

function getRequestMeta(c: Context) {
  return {
    ip: c.req.header("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: c.req.header("user-agent"),
  };
}

export const EmployerController = {
  async register(c: Context) {
    const body = getBody<RegisterInput>(c);
    const result = await authService.registerUser({ ...body, role: UserRole.EMPLOYER });
    return c.json(successResponse("Employer account created. Check your email for a verification code.", result), 201);
  },

  async login(c: Context) {
    const body = getBody<LoginInput>(c);
    const result = await authService.loginEmployer(body, getRequestMeta(c));
    return c.json(successResponse("Employer login successful.", result));
  },

  async getWorkspace(c: Context) {
    const userId = c.get("userId");
    const workspace = await authService.getEmployerWorkspace(userId);
    return c.json(successResponse("Workspace retrieved.", workspace));
  },

  async updateWorkspace(c: Context) {
    const userId = c.get("userId");
    const body = getBody<UpdateWorkspaceInput>(c);
    const workspace = await authService.getEmployerWorkspace(userId);
    const updated = await employerRepo.updateWorkspace(workspace.id, body);
    return c.json(successResponse("Workspace updated.", updated));
  },
};
