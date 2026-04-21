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
  // FIX (C1): `.single()` throws when no row exists, which was causing every
  // first-time submission to fail. `.maybeSingle()` returns `data: null` for
  // no match, which is what we want here.
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
    // Resubmit path (allowed only when previous status was 'returned')
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

export async function triageSubmission(id: string, input: {
  triage_decision: "valid" | "invalid" | "returned";
  triage_reason?: string;
  triaged_by: string;
}) {
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

export async function scoreSubmission(id: string, input: {
  scores: { criterion_id: string; criterion_title: string; weight: number; score_percent: number }[];
  reviewer_notes?: string;
  scored_by: string;
}) {
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
