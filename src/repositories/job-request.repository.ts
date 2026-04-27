import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError, BadRequestError } from "../exceptions/errors.js";
import { computeDeposit } from "../config/constants.js";

type CustomRubricRow = {
  id?: string;
  title: string;
  description?: string;
  weight: number;
  sort_order?: number;
};

export async function listJobRequests(employerId: string, status?: string, draftsOnly = false) {
  let q = supabase.from("job_requests").select(`
    id, title, role_type, role_level, status, challenge_id, challenge_cap,
    shortlist_size, deadline, deposit_amount, admin_fee,
    final_charge, published_at, created_at, updated_at,
    challenges(id, title)
  `).eq("employer_id", employerId).order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  if (draftsOnly) q = q.eq("status", "draft");
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getJobRequest(id: string, employerId?: string) {
  let q = supabase.from("job_requests").select(`
    id, title, role_type, role_level, status, challenge_id, challenge_cap,
    shortlist_size, deadline, deposit_amount, admin_fee, final_charge,
    snapshot_challenge, snapshot_rubric, custom_rubric,
    published_at, closed_at, created_at, updated_at,
    challenges(id, title, summary, scenario, deliverables,
      submission_format, constraints_text,
      rubric_criteria(id, title, description, weight, sort_order)),
    workspaces(id, company_name)
  `).eq("id", id);
  if (employerId) q = q.eq("employer_id", employerId);
  const { data, error } = await q.single();
  if (error?.code === "PGRST116") throw new NotFoundError("Job request not found", "REQUEST_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function getJobRequestAdmin(id: string) {
  return getJobRequest(id);
}

export async function createJobRequest(input: {
  workspace_id: string;
  employer_id: string;
  title: string;
  role_type?: string;
  role_level?: string;
  challenge_id?: string;
  challenge_cap?: number;
  shortlist_size?: number;
  deadline?: string;
  custom_rubric?: CustomRubricRow[];
}) {
  // Deposit is centralized in config/constants.ts so we change pricing
  // in ONE place. Backend default: ₦800k admin_fee + cap × ₦180k unit_price.
  const cap = input.challenge_cap ?? 10;
  const { admin_fee, deposit_amount } = computeDeposit(cap);

  const { data, error } = await supabase.from("job_requests").insert({
    workspace_id: input.workspace_id,
    employer_id: input.employer_id,
    title: input.title,
    role_type: input.role_type,
    role_level: input.role_level,
    challenge_id: input.challenge_id,
    challenge_cap: cap,
    shortlist_size: input.shortlist_size ?? 3,
    deadline: input.deadline,
    admin_fee,
    deposit_amount,
    custom_rubric: input.custom_rubric ?? null,
    status: "draft",
  }).select().single();
  if (error) throw new InternalError(error.message);
  return data;
}

export async function updateJobRequest(id: string, employerId: string, input: {
  title?: string;
  role_type?: string;
  role_level?: string;
  challenge_id?: string;
  challenge_cap?: number;
  shortlist_size?: number;
  deadline?: string;
  custom_rubric?: CustomRubricRow[];
}) {
  // If challenge_cap changes, the deposit changes too.
  const patch: Record<string, unknown> = { ...input, updated_at: new Date().toISOString() };
  if (input.challenge_cap !== undefined) {
    const { deposit_amount } = computeDeposit(input.challenge_cap);
    patch.deposit_amount = deposit_amount;
  }

  const { data, error } = await supabase.from("job_requests")
    .update(patch)
    .eq("id", id).eq("employer_id", employerId).eq("status", "draft")
    .select().single();
  if (error?.code === "PGRST116") throw new NotFoundError("Draft request not found", "REQUEST_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function publishJobRequest(id: string, employerId: string) {
  const req = await getJobRequest(id, employerId);
  const reqAny = req as any;
  if (reqAny.status !== "draft") {
    throw new BadRequestError("Only draft requests can be published.", "NOT_DRAFT");
  }

  const snapshot_challenge = reqAny.challenges ?? null;

  // Rubric snapshot precedence:
  //   1. If employer set custom_rubric, snapshot that (the "customizes the
  //      challenge brief and rubric before publishing" case).
  //   2. Else, snapshot the challenge's default rubric.
  let snapshot_rubric: unknown = null;
  if (reqAny.custom_rubric && Array.isArray(reqAny.custom_rubric) && reqAny.custom_rubric.length) {
    const total = reqAny.custom_rubric.reduce(
      (s: number, c: { weight: number }) => s + c.weight, 0
    );
    if (total !== 100) {
      throw new BadRequestError(
        "custom_rubric weights must sum to exactly 100 before publishing",
        "RUBRIC_WEIGHT_INVALID"
      );
    }
    snapshot_rubric = reqAny.custom_rubric;
  } else {
    snapshot_rubric = reqAny.challenges?.rubric_criteria ?? null;
  }

  const { data, error } = await supabase.from("job_requests")
    .update({
      status: "published",
      snapshot_challenge,
      snapshot_rubric,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id).eq("employer_id", employerId)
    .select().single();
  if (error) throw new InternalError(error.message);
  return data;
}

export async function closeJobRequest(id: string, employerId: string) {
  const { data, error } = await supabase.from("job_requests")
    .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id).eq("employer_id", employerId).select().single();
  if (error) throw new InternalError(error.message);
  return data;
}

export async function getRequestSubmissionStats(requestId: string) {
  const { data, error } = await supabase.from("submissions")
    .select("id, status").eq("job_request_id", requestId);
  if (error) throw new InternalError(error.message);
  const all = data ?? [];
  return {
    total: all.length,
    submitted: all.filter(s => s.status === "submitted").length,
    under_review: all.filter(s => s.status === "under_review").length,
    returned: all.filter(s => s.status === "returned").length,
    scored: all.filter(s => s.status === "scored").length,
    shortlisted: all.filter(s => s.status === "shortlisted").length,
    rejected: all.filter(s => s.status === "rejected").length,
  };
}

/**
 * Submissions list scoped to one request, viewable by the owning employer.
 * Returns the candidates' identity + submission status, but NOT the
 * artifact URLs or scoring breakdown until the shortlist is delivered
 * (we don't want employers fishing in raw submissions before review).
 *
 * Once the request reaches `shortlisted` status, full details of the
 * shortlisted submissions are exposed via /employer/shortlists/:id.
 */
export async function listSubmissionsForEmployer(
  requestId: string,
  employerId: string,
) {
  // Verify ownership first
  const own = await supabase.from("job_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("employer_id", employerId)
    .maybeSingle();
  if (own.error) throw new InternalError(own.error.message);
  if (!own.data) throw new NotFoundError("Job request not found", "REQUEST_NOT_FOUND");

  const { data, error } = await supabase.from("submissions").select(`
    id, status, artifact_type, submitted_at, updated_at,
    triage_decision, total_score, resubmit_count,
    users!candidate_id(id, first_name, last_name, avatar_url)
  `).eq("job_request_id", requestId)
    .order("submitted_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

// Admin: list all requests for review queue
export async function listAllJobRequestsAdmin(status?: string) {
  let q = supabase.from("job_requests").select(`
    id, title, role_type, role_level, status, challenge_cap,
    shortlist_size, deadline, deposit_amount, published_at, created_at,
    users!employer_id(email, first_name, last_name),
    workspaces(company_name)
  `).order("published_at", { ascending: false });
  if (status) q = q.eq("status", status);
  else q = q.neq("status", "draft");
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function updateJobRequestStatusAdmin(id: string, status: string) {
  const { data, error } = await supabase.from("job_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
  if (error) throw new InternalError(error.message);
  return data;
}
