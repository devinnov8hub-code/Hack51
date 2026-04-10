import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as catalogRepo from "../repositories/catalog.repository.js";
import type { CreateRoleInput, UpdateRoleInput, CreateChallengeInput, UpdateChallengeInput } from "../dto/catalog.dto.js";

export const CatalogController = {
  // ── ROLES ────────────────────────────────────────────────────────────────
  async listRoles(c: Context) {
    const activeOnly = c.req.query("active") !== "false";
    const data = await catalogRepo.listCatalogRoles(activeOnly);
    return c.json(successResponse("Roles retrieved.", data));
  },

  async getRole(c: Context) {
    const { id } = c.req.param() as { id: string };
    const data = await catalogRepo.getCatalogRole(id);
    return c.json(successResponse("Role retrieved.", data));
  },

  async createRole(c: Context) {
    const body = getBody<CreateRoleInput>(c);
    const userId = c.get("userId");
    const data = await catalogRepo.createCatalogRole({ ...body, created_by: userId });
    return c.json(successResponse("Role created successfully. Role can now be accessed by employers.", data), 201);
  },

  async updateRole(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<UpdateRoleInput>(c);
    const data = await catalogRepo.updateCatalogRole(id, body);
    return c.json(successResponse("Role updated.", data));
  },

  async deleteRole(c: Context) {
    const { id } = c.req.param() as { id: string };
    await catalogRepo.deleteCatalogRole(id);
    return c.json(successResponse("Role deleted. All associated skills and challenges have been removed.", null));
  },

  // ── CHALLENGES ────────────────────────────────────────────────────────────
  async listChallenges(c: Context) {
    const activeOnly = c.req.query("active") !== "false";
    const data = await catalogRepo.listChallenges(activeOnly);
    return c.json(successResponse("Challenges retrieved.", data));
  },

  async getChallenge(c: Context) {
    const { id } = c.req.param() as { id: string };
    const data = await catalogRepo.getChallenge(id);
    return c.json(successResponse("Challenge retrieved.", data));
  },

  async createChallenge(c: Context) {
    const body = getBody<CreateChallengeInput>(c);
    const userId = c.get("userId");
    const data = await catalogRepo.createChallenge({ ...body, created_by: userId });
    return c.json(successResponse("Challenge created.", data), 201);
  },

  async updateChallenge(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<UpdateChallengeInput>(c);
    const data = await catalogRepo.updateChallenge(id, body);
    return c.json(successResponse("Challenge updated.", data));
  },

  async deleteChallenge(c: Context) {
    const { id } = c.req.param() as { id: string };
    await catalogRepo.deleteChallenge(id);
    return c.json(successResponse("Challenge deleted.", null));
  },
};
