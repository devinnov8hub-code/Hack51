import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError, ConflictError } from "../exceptions/errors.js";

export async function getSubmission(id: string) {
  const { data, error } = await supabase.from("submissions").select(`
    id, status, artifact_urls, artifact_type, submission_statement,
    integrity_declared, triage_decision, triage_reason, triaged_at,
    reviewer_notes, total_score, scored_at, resubmit_count,
    submitted_at, created_at, updated_at,
    users!candidate_id(id, email, first_name, last_name, avatar_url),
    job_requests!job_request_id(
      id, title, role_type, snapshot_challenge, snapshot_rubric,
      challenge_cap, shortlist_size, deadline
    ),
    submission_scores(
      id, criterion_id, criterion_title, weight, score_percent
    )
  `).eq("id", id).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Submission not found", "SUBMISSION_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function listSubmissionsForRequest(requestId: string, adminView = false) {
  const selectFields = adminView
    ? `id, status, artifact_urls, artifact_type, submission_statement,
       triage_decision, triage_reason, reviewer_notes, total_score,
       submitted_at, updated_at,
       users!candidate_id(id, email, first_name, last_name, avatar_url)`
    : `id, status, submitted_at, updated_at,
       users!candidate_id(id, first_name, last_name)`;
  const { data, error } = await supabase.from("submissions")
    .select(selectFields).eq("job_request_id", requestId)
    .order("submitted_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function listCandidateSubmissions(candidateId: string) {
  const { data, error } = await supabase.from("submissions").select(`
    id, status, artifact_urls, submission_statement,
    triage_decision, triage_reason, reviewer_notes, total_score,
    resubmit_count, submitted_at, updated_at,
    job_requests!job_request_id(
      id, title, role_type, role_level, deadline,
      workspaces(company_name)
    )
  `).eq("candidate_id", candidateId).order("submitted_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function createSubmission(input: {
  job_request_id: string;
  candidate_id: string;
  artifact_urls: string[];
  artifact_type: string;
  submission_statement?: string;
  integrity_declared: boolean;
}) {
  // Use maybeSingle so a brand-new submission (no existing row) returns
  // data: null instead of throwing.
  const { data: existing, error: existingErr } = await supabase.from("submissions")
    .select("id, status")
    .eq("job_request_id", input.job_request_id)
    .eq("candidate_id", input.candidate_id)
    .maybeSingle();
  if (existingErr) throw new InternalError(existingErr.message);

  if (existing) {
    if (existing.status !== "returned") {
      throw new ConflictError("You have already submitted to this request", "ALREADY_SUBMITTED");
    }
    // Resubmit path: only allowed when the previous status was 'returned'.
    const { data, error } = await supabase.from("submissions")
      .update({
        artifact_urls: input.artifact_urls,
        artifact_type: input.artifact_type,
        submission_statement: input.submission_statement ?? null,
        integrity_declared: input.integrity_declared,
        status: "submitted",
        triage_decision: null,
        triage_reason: null,
        reviewer_notes: null,
        total_score: null,
        triaged_at: null,
        scored_at: null,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id)
      .select().single();
    if (error) throw new InternalError(error.message);

    await supabase.rpc("increment_resubmit_count", { submission_id: existing.id });
    return data;
  }

  const { data, error } = await supabase.from("submissions")
    .insert({
      job_request_id: input.job_request_id,
      candidate_id: input.candidate_id,
      artifact_urls: input.artifact_urls,
      artifact_type: input.artifact_type,
      submission_statement: input.submission_statement ?? null,
      integrity_declared: input.integrity_declared,
      status: "submitted",
    })
    .select().single();
  if (error) throw new InternalError(error.message);
  return data;
}

/**
 * Triage a submission. The admin marks it valid (→ under_review),
 * invalid (→ rejected) or returned (→ candidate can resubmit).
 *
 * FIX (v1.2.3): previously, triaging a non-existent submission id returned
 * a 500 with a leaked Supabase error ("Cannot coerce the result to a single
 * JSON object"). Now we look the row up first with maybeSingle() and throw
 * a clean 404 SUBMISSION_NOT_FOUND, matching the behaviour of getSubmission.
 */
export async function triageSubmission(id: string, input: {
  triage_decision: "valid" | "invalid" | "returned";
  triage_reason?: string;
  triaged_by: string;
}) {
  // Confirm the submission exists before attempting to update it.
  const { data: existing, error: existingErr } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existingErr) throw new InternalError(existingErr.message);
  if (!existing) {
    throw new NotFoundError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  const statusMap = { valid: "under_review", invalid: "rejected", returned: "returned" } as const;
  const { data, error } = await supabase.from("submissions")
    .update({
      triage_decision: input.triage_decision,
      triage_reason: input.triage_reason ?? null,
      triaged_by: input.triaged_by,
      triaged_at: new Date().toISOString(),
      status: statusMap[input.triage_decision],
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();
  if (error) throw new InternalError(error.message);
  return data;
}

/**
 * Score a submission. Total is auto-calculated as Σ(weight × score_percent / 100).
 *
 * FIX (v1.2.3): same 500-on-missing-id fix as triage. Verifies the
 * submission exists before scoring; returns 404 SUBMISSION_NOT_FOUND
 * cleanly instead of leaking a Postgres coercion error.
 */
export async function scoreSubmission(id: string, input: {
  scores: { criterion_id: string; criterion_title: string; weight: number; score_percent: number }[];
  reviewer_notes?: string;
  scored_by: string;
}) {
  const { data: existing, error: existingErr } = await supabase
    .from("submissions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existingErr) throw new InternalError(existingErr.message);
  if (!existing) {
    throw new NotFoundError("Submission not found", "SUBMISSION_NOT_FOUND");
  }

  const total = input.scores.reduce((s, c) => s + (c.weight * c.score_percent / 100), 0);

  await supabase.from("submission_scores").delete().eq("submission_id", id);
  const scoreRows = input.scores.map(s => ({ submission_id: id, ...s }));
  const { error: se } = await supabase.from("submission_scores").insert(scoreRows);
  if (se) throw new InternalError(se.message);

  const { data, error } = await supabase.from("submissions")
    .update({
      total_score: Math.round(total * 100) / 100,
      reviewer_notes: input.reviewer_notes ?? null,
      scored_by: input.scored_by,
      scored_at: new Date().toISOString(),
      status: "scored",
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();
  if (error) throw new InternalError(error.message);
  return data;
}
