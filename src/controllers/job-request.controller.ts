import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as jobRequestRepo from "../repositories/job-request.repository.js";
import * as shortlistRepo from "../repositories/shortlist.repository.js";
import * as walletRepo from "../repositories/wallet.repository.js";
import * as paymentService from "../services/payment.service.js";
import * as paymentRepo from "../repositories/payment.repository.js";
import { BadRequestError, NotFoundError } from "../exceptions/errors.js";
import { isPaymentSkipped, getFullListUnlockNgn } from "../config/constants.js";
import type { CreateRequestInput, UpdateRequestInput } from "../dto/request.dto.js";

export const JobRequestController = {
  // ── EMPLOYER: REQUEST WIZARD ──────────────────────────────────────────────
  async create(c: Context) {
    const body = getBody<CreateRequestInput>(c);
    const userId = c.get("userId");

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

  /**
   * NEW: List submissions for one of the employer's own requests.
   * The Figma "Active Request View" was incomplete without this — the
   * submission_stats counts in /employer/requests/:id told the employer
   * "12 submissions" but didn't let them see who submitted.
   */
  async listSubmissions(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const data = await jobRequestRepo.listSubmissionsForEmployer(id, userId);
    return c.json(successResponse("Submissions retrieved.", data));
  },

  async update(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const body = getBody<UpdateRequestInput>(c);
    const data = await jobRequestRepo.updateJobRequest(id, userId, body);
    return c.json(successResponse("Request updated.", data));
  },

  /**
   * Publish a draft request.
   *
   * Behaviour depends on the SKIP_PAYMENT flag (config/constants.ts):
   *   skip=true  (default in non-prod): request → published, payment auto-success.
   *   skip=false (prod):                 Paystack flow — frontend redirects to URL.
   *
   * Frontend reads `payment.skip` to decide whether to redirect.
   */
  async publish(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");

    const req = await jobRequestRepo.getJobRequest(id, userId);
    if ((req as any).status !== "draft") {
      throw new BadRequestError("Only draft requests can be published.", "NOT_DRAFT");
    }
    if (!(req as any).challenge_id) {
      throw new BadRequestError("Select a challenge before publishing.", "NO_CHALLENGE");
    }

    const depositAmount = (req as any).deposit_amount ?? 0;
    const skip = isPaymentSkipped();

    const payment = await paymentService.initiatePayment({
      userId,
      email: userEmail,
      amountKobo: depositAmount * 100,
      jobRequestId: id,
      paymentType: "deposit",
      metadata: { request_title: (req as any).title, skip_payment: skip },
    });

    if (skip) {
      await paymentRepo.updatePaymentStatus(
        payment.payment_reference, "success", `skip_${Date.now()}`,
      );
    }

    const data = await jobRequestRepo.publishJobRequest(id, userId);

    return c.json(successResponse(
      skip
        ? "Request published. Payment skipped (dev mode)."
        : "Request published. Snapshot locked. Complete the payment to activate.",
      {
        request: data,
        payment: { ...payment, skip, status: skip ? "success" : "pending" },
      },
    ));
  },

  async close(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const data = await jobRequestRepo.closeJobRequest(id, userId);
    return c.json(successResponse("Request closed.", data));
  },

  /**
   * NEW: "Rerun request" — duplicate a closed/shortlisted request as a
   * fresh draft. Mirrors the button in Figma screen 13.
   */
  async rerun(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");

    const original = await jobRequestRepo.getJobRequest(id, userId);
    const o = original as any;

    const { supabase } = await import("../config/supabase.js");
    const { data: ws } = await supabase.from("workspaces").select("id").eq("owner_id", userId).single();
    if (!ws) throw new NotFoundError("Workspace not found.", "WORKSPACE_NOT_FOUND");

    const newDraft = await jobRequestRepo.createJobRequest({
      workspace_id: ws.id,
      employer_id: userId,
      title: `${o.title} (rerun)`,
      role_type: o.role_type,
      role_level: o.role_level,
      challenge_id: o.challenge_id,
      challenge_cap: o.challenge_cap,
      shortlist_size: o.shortlist_size,
      // Don't carry: deadline, snapshots, custom_rubric is preserved
      custom_rubric: o.custom_rubric ?? undefined,
    });

    return c.json(successResponse(
      "New draft created from previous request. Set a deadline and publish when ready.",
      newDraft,
    ), 201);
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

  /**
   * NEW: Pay-to-unlock the full talent list (Figma screen 14, ₦240k).
   * Skip-payment-aware just like publish.
   */
  async unlockFullList(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");

    const shortlist = await shortlistRepo.getEmployerShortlist(id, userId);
    const s = shortlist as any;
    if (s.status !== "shortlisted") {
      throw new BadRequestError(
        "The shortlist must be delivered before unlocking the full list.",
        "SHORTLIST_NOT_DELIVERED",
      );
    }

    const existing = await paymentRepo.findFullListUnlockPayment(id, userId);
    if (existing && existing.status === "success") {
      return c.json(successResponse(
        "Full talent list is already unlocked for this request.",
        { request_id: id, unlocked: true, payment_reference: existing.payment_reference },
      ));
    }

    const amountNgn = getFullListUnlockNgn();
    const skip = isPaymentSkipped();

    const payment = await paymentService.initiatePayment({
      userId,
      email: userEmail,
      amountKobo: amountNgn * 100,
      jobRequestId: id,
      paymentType: "full_list_unlock",
      metadata: { request_title: s.title, skip_payment: skip },
    });

    if (skip) {
      await paymentRepo.updatePaymentStatus(
        payment.payment_reference, "success", `skip_${Date.now()}`,
      );
    }

    return c.json(successResponse(
      skip
        ? "Full talent list unlocked (dev mode, payment skipped)."
        : "Payment initiated. Complete checkout to unlock the full talent list.",
      {
        request_id: id,
        amount_ngn: amountNgn,
        payment: { ...payment, skip, status: skip ? "success" : "pending" },
        unlocked: skip,
      },
    ));
  },

  /**
   * NEW: Get every scored candidate for a request (only returned after
   * the unlock fee is paid).
   */
  async getFullCandidateList(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");

    const shortlist = await shortlistRepo.getEmployerShortlist(id, userId);
    const s = shortlist as any;

    const existing = await paymentRepo.findFullListUnlockPayment(id, userId);
    const unlocked = existing?.status === "success";

    if (!unlocked) {
      throw new BadRequestError(
        "Full talent list is locked. Pay the unlock fee first.",
        "FULL_LIST_LOCKED",
      );
    }

    const allCandidates = await shortlistRepo.getScoredSubmissionsForShortlist(id);
    return c.json(successResponse("Full candidate list retrieved.", {
      request: s,
      candidates: allCandidates,
    }));
  },

  /**
   * NEW: Export the shortlist as CSV.
   * Returns text/csv (not the JSON envelope) so the browser downloads it.
   */
  async exportShortlistCsv(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");

    const shortlist = await shortlistRepo.getEmployerShortlist(id, userId);
    const s = shortlist as any;

    const rows: string[] = [
      "rank,candidate_name,email,total_score,artifact_urls,reviewer_notes",
    ];
    for (const entry of (s.shortlists ?? [])) {
      const u = entry.users;
      const sub = entry.submissions;
      const name = `"${[u?.first_name, u?.last_name].filter(Boolean).join(" ").replace(/"/g, '""')}"`;
      const email = u?.email ?? "";
      const urls = `"${(sub?.artifact_urls ?? []).join(" | ").replace(/"/g, '""')}"`;
      const notes = `"${(sub?.reviewer_notes ?? "").replace(/"/g, '""')}"`;
      rows.push(`${entry.rank},${name},${email},${entry.total_score},${urls},${notes}`);
    }

    const csv = rows.join("\n");
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shortlist-${id}.csv"`,
      },
    });
  },

  // ── EMPLOYER: BILLING ─────────────────────────────────────────────────────
  async getBilling(c: Context) {
    const userId = c.get("userId");
    const data = await walletRepo.getEmployerBilling(userId);
    return c.json(successResponse("Billing retrieved.", data));
  },

  /**
   * NEW: Per-request billing breakdown (Figma screen 15 right).
   */
  async getBillingDetail(c: Context) {
    const { id } = c.req.param() as { id: string };
    const userId = c.get("userId");
    const data = await walletRepo.getEmployerBillingDetail(userId, id);
    return c.json(successResponse("Billing detail retrieved.", data));
  },
};
