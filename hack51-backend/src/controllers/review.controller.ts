import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as jobRequestRepo from "../repositories/job-request.repository.js";
import * as submissionRepo from "../repositories/submission.repository.js";
import * as shortlistRepo from "../repositories/shortlist.repository.js";
import * as notificationRepo from "../repositories/notification.repository.js";
import type { TriageInput, ScoreInput, ConfirmShortlistInput } from "../dto/request.dto.js";

export const ReviewController = {
  // ── REQUEST QUEUE ─────────────────────────────────────────────────────────
  async listRequests(c: Context) {
    const status = c.req.query("status");
    const data = await jobRequestRepo.listAllJobRequestsAdmin(status);
    return c.json(successResponse("Review queue retrieved.", data));
  },

  // ── SUBMISSIONS FOR A REQUEST ─────────────────────────────────────────────
  async listSubmissions(c: Context) {
    const { requestId } = c.req.param() as { requestId: string };
    const data = await submissionRepo.listSubmissionsForRequest(requestId, true);
    const stats = await jobRequestRepo.getRequestSubmissionStats(requestId);
    return c.json(successResponse("Submissions retrieved.", { stats, submissions: data }));
  },

  async getSubmission(c: Context) {
    const { id } = c.req.param() as { id: string };
    const data = await submissionRepo.getSubmission(id);
    return c.json(successResponse("Submission retrieved.", data));
  },

  // ── TRIAGE ────────────────────────────────────────────────────────────────
  async triageSubmission(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<TriageInput>(c);
    const reviewerId = c.get("userId");

    const data = await submissionRepo.triageSubmission(id, {
      triage_decision: body.decision,
      triage_reason: body.reason,
      triaged_by: reviewerId,
    });

    // Notify candidate of outcome
    const sub = await submissionRepo.getSubmission(id);
    const candidateId = (sub.users as any)?.id;
    if (candidateId) {
      const msgMap = {
        valid: "Your submission is being evaluated. We'll notify you of the outcome.",
        invalid: `Your submission was marked invalid. Reason: ${body.reason ?? "Not specified"}.`,
        returned: `Your submission was returned for revision. Reason: ${body.reason ?? "Not specified"}.`,
      };
      await notificationRepo.createNotification({
        user_id: candidateId,
        title: "Submission Update",
        body: msgMap[body.decision],
        type: body.decision === "valid" ? "info" : "warning",
      }).catch(() => {});
    }

    return c.json(successResponse(`Submission marked as ${body.decision}.`, data));
  },

  // ── SCORING ───────────────────────────────────────────────────────────────
  async scoreSubmission(c: Context) {
    const { id } = c.req.param() as { id: string };
    const body = getBody<ScoreInput>(c);
    const reviewerId = c.get("userId");

    const data = await submissionRepo.scoreSubmission(id, {
      scores: body.scores,
      reviewer_notes: body.reviewer_notes,
      scored_by: reviewerId,
    });

    return c.json(successResponse("Submission scored.", data));
  },

  // ── SHORTLIST MANAGEMENT ──────────────────────────────────────────────────
  async listShortlists(c: Context) {
    const status = c.req.query("status");
    const data = await shortlistRepo.listShortlistsAdmin(status);
    return c.json(successResponse("Shortlists retrieved.", data));
  },

  async getScoredSubmissions(c: Context) {
    const { requestId } = c.req.param() as { requestId: string };
    const data = await shortlistRepo.getScoredSubmissionsForShortlist(requestId);
    return c.json(successResponse("Scored submissions retrieved. Select top candidates.", data));
  },

  async confirmShortlist(c: Context) {
    const { requestId } = c.req.param() as { requestId: string };
    const body = getBody<ConfirmShortlistInput>(c);
    const adminId = c.get("userId");

    const data = await shortlistRepo.confirmShortlist(requestId, {
      candidate_submission_pairs: body.selections.map(s => ({
        candidate_id: s.candidate_id,
        submission_id: s.submission_id,
        rank: s.rank,
      })),
      confirmed_by: adminId,
    });

    return c.json(successResponse("Shortlist confirmed. Ready to deliver.", data));
  },

  async deliverShortlist(c: Context) {
    const { requestId } = c.req.param() as { requestId: string };
    const adminId = c.get("userId");

    const result = await shortlistRepo.deliverShortlist(requestId, adminId);

    // Notify the employer
    const req = await jobRequestRepo.getJobRequestAdmin(requestId);
    if ((req as any).employer_id) {
      await notificationRepo.createNotification({
        user_id: (req as any).employer_id,
        title: "Shortlist Delivered",
        body: `Your shortlist for "${(req as any).title}" is ready. Final charge: ₦${result.final_charge.toLocaleString()}. Credit returned: ₦${result.credit_returned.toLocaleString()}.`,
        type: "success",
        metadata: { job_request_id: requestId, final_charge: result.final_charge },
      }).catch(() => {});
    }

    return c.json(successResponse(
      "Shortlist delivered. Employer has been notified and balance automatically adjusted.",
      result
    ));
  },
};
