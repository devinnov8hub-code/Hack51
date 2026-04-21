import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as catalogRepo from "../repositories/catalog.repository.js";
import * as notificationRepo from "../repositories/notification.repository.js";
import type {
  CreateRoleInput, UpdateRoleInput,
  CreateChallengeInput, UpdateChallengeInput,
  ProposeRoleInput, ProposeChallengeInput, ReviewProposalInput,
} from "../dto/catalog.dto.js";

export const CatalogController = {
  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN: ROLES
  // ═══════════════════════════════════════════════════════════════════════

  async listRoles(c: Context) {
    const activeOnly    = c.req.query("active") !== "false";
    const status        = c.req.query("status") as "approved" | "pending" | "rejected" | undefined;
    const approvedOnly  = c.req.query("approved") !== "false"; // default true
    const data = await catalogRepo.listCatalogRoles({ activeOnly, approvedOnly, status });
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
    const data = await catalogRepo.createCatalogRole({
      ...body,
      created_by: userId,
      status: "approved",
    });
    return c.json(successResponse(
      "Role created successfully. Role can now be accessed by employers.",
      data,
    ), 201);
  },

  // FIX (A1/A2): PUT now correctly persists skill_levels + capabilities.
  async updateRole(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<UpdateRoleInput>(c);
    const data = await catalogRepo.updateCatalogRole(id, body);
    return c.json(successResponse("Role updated.", data));
  },

  async deleteRole(c: Context) {
    const { id } = c.req.param() as { id: string };
    await catalogRepo.deleteCatalogRole(id);
    return c.json(successResponse(
      "Role deleted. All associated skills and challenges have been removed.",
      null,
    ));
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN: CHALLENGES
  // ═══════════════════════════════════════════════════════════════════════

  async listChallenges(c: Context) {
    const activeOnly   = c.req.query("active") !== "false";
    const status       = c.req.query("status") as "approved" | "pending" | "rejected" | undefined;
    const approvedOnly = c.req.query("approved") !== "false";
    const data = await catalogRepo.listChallenges({ activeOnly, approvedOnly, status });
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
    const data = await catalogRepo.createChallenge({
      ...body,
      created_by: userId,
      status: "approved",
    });
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

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN: PROPOSAL REVIEW QUEUE (B1/B2)
  // ═══════════════════════════════════════════════════════════════════════

  async listPendingRoleProposals(c: Context) {
    const data = await catalogRepo.listPendingRoleProposals();
    return c.json(successResponse("Pending role proposals retrieved.", data));
  },

  async listPendingChallengeProposals(c: Context) {
    const data = await catalogRepo.listPendingChallengeProposals();
    return c.json(successResponse("Pending challenge proposals retrieved.", data));
  },

  async reviewRoleProposal(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<ReviewProposalInput>(c);
    const adminId = c.get("userId");

    const role = await catalogRepo.getCatalogRole(id);
    const roleAny = role as any;

    const data =
      body.decision === "approve"
        ? await catalogRepo.approveRoleProposal(id, adminId)
        : await catalogRepo.rejectRoleProposal(id, adminId, body.reason);

    if (roleAny.proposed_by) {
      await notificationRepo.createNotification({
        user_id: roleAny.proposed_by,
        title: body.decision === "approve" ? "Your proposed role was approved" : "Your proposed role was rejected",
        body: body.decision === "approve"
          ? `"${roleAny.name}" is now available in the public catalog.`
          : `"${roleAny.name}" was not approved. Reason: ${body.reason ?? "Not specified"}.`,
        type: body.decision === "approve" ? "success" : "warning",
        metadata: { role_id: id },
      }).catch(() => {});
    }

    return c.json(successResponse(`Role proposal ${body.decision}d.`, data));
  },

  async reviewChallengeProposal(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<ReviewProposalInput>(c);
    const adminId = c.get("userId");

    const ch = await catalogRepo.getChallenge(id);
    const chAny = ch as any;

    const data =
      body.decision === "approve"
        ? await catalogRepo.approveChallengeProposal(id, adminId)
        : await catalogRepo.rejectChallengeProposal(id, adminId, body.reason);

    if (chAny.proposed_by) {
      await notificationRepo.createNotification({
        user_id: chAny.proposed_by,
        title: body.decision === "approve" ? "Your proposed challenge was approved" : "Your proposed challenge was rejected",
        body: body.decision === "approve"
          ? `"${chAny.title}" is now available in the public catalog.`
          : `"${chAny.title}" was not approved. Reason: ${body.reason ?? "Not specified"}.`,
        type: body.decision === "approve" ? "success" : "warning",
        metadata: { challenge_id: id },
      }).catch(() => {});
    }

    return c.json(successResponse(`Challenge proposal ${body.decision}d.`, data));
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EMPLOYER: READ-ONLY CATALOG BROWSE (FIX C3 + C6)
  // ═══════════════════════════════════════════════════════════════════════

  async listEmployerRoles(c: Context) {
    // Employers see approved, active catalog roles + any roles they themselves
    // have proposed (pending/rejected/approved) so their "drafts" view works.
    const userId = c.get("userId");
    const [approved, mine] = await Promise.all([
      catalogRepo.listCatalogRoles({ activeOnly: true, approvedOnly: true }),
      catalogRepo.listCatalogRoles({ activeOnly: false, approvedOnly: false, proposedBy: userId }),
    ]);
    // Dedup — an approved proposal shows up in both lists
    const seen = new Set(approved.map((r: any) => r.id));
    const mineOnly = mine.filter((r: any) => !seen.has(r.id));
    return c.json(successResponse("Roles retrieved.", { approved, my_proposals: mineOnly }));
  },

  async listEmployerChallenges(c: Context) {
    const userId = c.get("userId");
    const roleFilter = c.req.query("role_id") ?? undefined;
    const [approved, mine] = await Promise.all([
      catalogRepo.listChallenges({
        activeOnly: true,
        approvedOnly: true,
        catalogRoleId: roleFilter,
      }),
      catalogRepo.listChallenges({
        activeOnly: false,
        approvedOnly: false,
        proposedBy: userId,
        catalogRoleId: roleFilter,
      }),
    ]);
    const seen = new Set(approved.map((ch: any) => ch.id));
    const mineOnly = mine.filter((ch: any) => !seen.has(ch.id));
    return c.json(successResponse("Challenges retrieved.", { approved, my_proposals: mineOnly }));
  },

  // FIX (C4): filter by approved + active for employer-facing detail view
  async getEmployerChallenge(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    // Allow the employer to see their own proposal even if pending
    try {
      return c.json(successResponse(
        "Challenge retrieved.",
        await catalogRepo.getApprovedActiveChallenge(id),
      ));
    } catch (err: any) {
      if (err?.errorCode === "CHALLENGE_NOT_FOUND") {
        // maybe it's a pending proposal of theirs
        const ch = await catalogRepo.getChallenge(id);
        const chAny = ch as any;
        if (chAny.proposed_by === userId) {
          return c.json(successResponse("Challenge retrieved (your pending proposal).", ch));
        }
      }
      throw err;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EMPLOYER: PROPOSE ROLE / CHALLENGE (B1 / B2)
  // ═══════════════════════════════════════════════════════════════════════

  async proposeRole(c: Context) {
    const body = getBody<ProposeRoleInput>(c);
    const userId = c.get("userId");
    // Pending proposals don't go into the active catalog — the
    // listEmployerRoles / listCatalogRoles queries already filter on
    // status='approved' for the public set, so is_active doesn't need to
    // be toggled here. That means if the admin approves later, the role
    // immediately becomes publicly visible without an extra activation step.
    const data = await catalogRepo.createCatalogRole({
      ...body,
      created_by: userId,
      status: "pending",
      proposed_by: userId,
    });
    return c.json(successResponse(
      "Role proposal submitted. An admin will review and notify you.",
      data,
    ), 201);
  },

  async proposeChallenge(c: Context) {
    const body = getBody<ProposeChallengeInput>(c);
    const userId = c.get("userId");
    const data = await catalogRepo.createChallenge({
      ...body,
      created_by: userId,
      status: "pending",
      proposed_by: userId,
    });
    return c.json(successResponse(
      "Challenge proposal submitted. An admin will review and notify you.",
      data,
    ), 201);
  },
};
