import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import { getBody } from "../middleware/validate.middleware.js";
import * as submissionRepo from "../repositories/submission.repository.js";
import { BadRequestError, ForbiddenError } from "../exceptions/errors.js";
import type { SubmitInput } from "../dto/request.dto.js";

export const SubmissionController = {
  // ─── CANDIDATE: browse open challenges (no auth) ───────────────────────────
  async listOpenChallenges(c: Context) {
    const search = c.req.query("search");
    const { supabase } = await import("../config/supabase.js");

    let q = supabase.from("job_requests").select(`
      id, title, role_type, role_level, challenge_cap, shortlist_size,
      deadline, published_at, created_at,
      challenges(id, title, summary, scenario, deliverables,
        submission_format, constraints_text,
        rubric_criteria(title, weight)),
      workspaces(company_name, industry, logo_url)
    `).eq("status", "published").order("published_at", { ascending: false });

    if (search) q = q.ilike("title", `%${search}%`);

    const { data, error } = await q;
    if (error) throw new BadRequestError(error.message);
    return c.json(successResponse("Open challenges retrieved.", data ?? []));
  },

  async getChallengeDetail(c: Context) {
    const { id } = c.req.param() as { id: string };
    const { supabase } = await import("../config/supabase.js");

    const { data, error } = await supabase.from("job_requests").select(`
      id, title, role_type, role_level, challenge_cap, shortlist_size,
      deadline, published_at, snapshot_challenge, snapshot_rubric,
      challenges(id, title, summary, scenario, deliverables,
        submission_format, constraints_text, submission_requirements,
        rubric_criteria(id, title, description, weight, sort_order)),
      workspaces(company_name, industry, logo_url, description)
    `).eq("id", id).eq("status", "published").single();

    if (error) throw new BadRequestError("Challenge not found or no longer open", "CHALLENGE_NOT_FOUND");
    return c.json(successResponse("Challenge detail retrieved.", data));
  },

  // ─── CANDIDATE: submit ─────────────────────────────────────────────────────
  async submit(c: Context) {
    const { id: requestId } = c.req.param() as { id: string };
    const body = getBody<SubmitInput>(c);
    const candidateId = c.get("userId");

    const { supabase } = await import("../config/supabase.js");
    const { data: req } = await supabase.from("job_requests")
      .select("id, status, deadline, challenge_cap").eq("id", requestId).maybeSingle();

    if (!req || req.status !== "published") {
      throw new ForbiddenError("This challenge is no longer accepting submissions.", "CHALLENGE_CLOSED");
    }
    if (req.deadline && new Date(req.deadline) < new Date()) {
      throw new ForbiddenError("The submission deadline has passed.", "DEADLINE_PASSED");
    }

    const data = await submissionRepo.createSubmission({
      job_request_id: requestId,
      candidate_id: candidateId,
      artifact_urls: body.artifact_urls,
      artifact_type: body.artifact_type,
      submission_statement: body.submission_statement,
      integrity_declared: body.integrity_declared,
    });

    return c.json(successResponse("Submission received. We'll notify you of the outcome.", data), 201);
  },

  // ─── CANDIDATE: my submissions ─────────────────────────────────────────────
  async mySubmissions(c: Context) {
    const candidateId = c.get("userId");
    const data = await submissionRepo.listCandidateSubmissions(candidateId);
    return c.json(successResponse("Submissions retrieved.", data));
  },

  // FIX (C2): the previous implementation read `data.users.id` which depends
  // on whether Supabase returns the join as an object or array — unreliable.
  // Replace with a direct candidate_id check at the DB layer.
  async getMySubmission(c: Context) {
    const { id } = c.req.param() as { id: string };
    const candidateId = c.get("userId");

    // First, confirm the submission belongs to this candidate.
    const { supabase } = await import("../config/supabase.js");
    const { data: owner, error: ownerErr } = await supabase
      .from("submissions")
      .select("id, candidate_id")
      .eq("id", id).maybeSingle();
    if (ownerErr) throw new BadRequestError(ownerErr.message);
    if (!owner) throw new BadRequestError("Submission not found", "SUBMISSION_NOT_FOUND");
    if (owner.candidate_id !== candidateId) {
      throw new ForbiddenError("You do not have access to this submission.", "FORBIDDEN");
    }

    const data = await submissionRepo.getSubmission(id);
    return c.json(successResponse("Submission retrieved.", data));
  },
};
