import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as jobRequestRepo from "../repositories/job-request.repository.js";
import * as shortlistRepo from "../repositories/shortlist.repository.js";
import * as walletRepo from "../repositories/wallet.repository.js";
import * as paymentService from "../services/payment.service.js";
import { BadRequestError, NotFoundError } from "../exceptions/errors.js";
import type { CreateRequestInput, UpdateRequestInput } from "../dto/request.dto.js";

export const JobRequestController = {
  // ── EMPLOYER: REQUEST WIZARD ──────────────────────────────────────────────
  async create(c: Context) {
    const body = getBody<CreateRequestInput>(c);
    const userId = c.get("userId");

    // Get employer workspace id
    const { supabase } = await import("../config/supabase.js");
    const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", userId).single();
    if (!ws) throw new NotFoundError("Workspace not found. Complete your workspace profile first.", "WORKSPACE_NOT_FOUND");

    const data = await jobRequestRepo.createJobRequest({
      workspace_id: ws.id,
      employer_id: userId,
      ...body,
    });

    return c.json(successResponse("Draft request created.", data), 201);
  },

  async list(c: Context) {
    const userId = c.get("userId");
    const draftsOnly = c.req.query("drafts") === "true";
    const status = c.req.query("status");
    const data = await jobRequestRepo.listJobRequests(userId, status, draftsOnly);
    return c.json(successResponse("Requests retrieved.", data));
  },

  async getOne(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const req = await jobRequestRepo.getJobRequest(id, userId);
    const stats = await jobRequestRepo.getRequestSubmissionStats(id);
    return c.json(successResponse("Request retrieved.", { ...req, submission_stats: stats }));
  },

  async update(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const body = getBody<UpdateRequestInput>(c);
    const data = await jobRequestRepo.updateJobRequest(id, userId, body);
    return c.json(successResponse("Request updated.", data));
  },

  async publish(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");

    const req = await jobRequestRepo.getJobRequest(id, userId);
    if ((req as any).status !== "draft") throw new BadRequestError("Only draft requests can be published.", "NOT_DRAFT");
    if (!(req as any).challenge_id) throw new BadRequestError("Select a challenge before publishing.", "NO_CHALLENGE");

    // Initiate payment for the deposit
    const depositAmount = (req as any).deposit_amount ?? 0;
    const payment = await paymentService.initiatePayment({
      userId,
      email: userEmail,
      amountKobo: depositAmount * 100,
      jobRequestId: id,
      paymentType: "deposit",
      metadata: { request_title: (req as any).title },
    });

    // Actually publish (lock snapshot)
    const data = await jobRequestRepo.publishJobRequest(id, userId);

    return c.json(successResponse(
      "Request published. Snapshot locked. Complete the payment to activate.",
      { request: data, payment }
    ));
  },

  async close(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const data = await jobRequestRepo.closeJobRequest(id, userId);
    return c.json(successResponse("Request closed.", data));
  },

  // ── EMPLOYER: SHORTLISTS ──────────────────────────────────────────────────
  async listShortlists(c: Context) {
    const userId = c.get("userId");
    const data = await shortlistRepo.getEmployerShortlists(userId);
    return c.json(successResponse("Shortlists retrieved.", data));
  },

  async getShortlist(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const data = await shortlistRepo.getEmployerShortlist(id, userId);
    return c.json(successResponse("Shortlist retrieved.", data));
  },

  // ── EMPLOYER: BILLING ─────────────────────────────────────────────────────
  async getBilling(c: Context) {
    const userId = c.get("userId");
    const data = await walletRepo.getEmployerBilling(userId);
    return c.json(successResponse("Billing retrieved.", data));
  },
};
