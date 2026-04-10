import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError, BadRequestError } from "../exceptions/errors.js";

export async function listShortlistsAdmin(status?: string) {
  let q = supabase.from("job_requests").select(`
    id, title, role_type, shortlist_size, status, published_at,
    shortlists(id, rank, total_score, confirmed_at, delivered_at,
      users!candidate_id(id, email, first_name, last_name)),
    users!employer_id(email, first_name, last_name),
    workspaces(company_name)
  `).in("status", ["evaluating", "shortlisted", "closed"])
    .order("published_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getScoredSubmissionsForShortlist(requestId: string) {
  const { data, error } = await supabase.from("submissions").select(`
    id, total_score, status, submitted_at, scored_at,
    users!candidate_id(id, email, first_name, last_name, avatar_url),
    submission_scores(criterion_id, criterion_title, weight, score_percent)
  `).eq("job_request_id", requestId)
    .eq("status", "scored")
    .order("total_score", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function confirmShortlist(requestId: string, input: {
  candidate_submission_pairs: { candidate_id: string; submission_id: string; rank: number }[];
  confirmed_by: string;
}) {
  const req = await supabase.from("job_requests")
    .select("id, shortlist_size, status").eq("id", requestId).single();
  if (req.error) throw new NotFoundError("Request not found", "REQUEST_NOT_FOUND");
  if (req.data.status === "shortlisted") throw new BadRequestError("Shortlist already delivered", "ALREADY_SHORTLISTED");

  // Get scores for each submission
  const subIds = input.candidate_submission_pairs.map(p => p.submission_id);
  const { data: scores } = await supabase.from("submissions")
    .select("id, total_score").in("id", subIds);
  const scoreMap = new Map((scores ?? []).map(s => [s.id, s.total_score]));

  // Delete any previous shortlist entries for this request
  await supabase.from("shortlists").delete().eq("job_request_id", requestId);

  const rows = input.candidate_submission_pairs.map(p => ({
    job_request_id: requestId,
    candidate_id: p.candidate_id,
    submission_id: p.submission_id,
    rank: p.rank,
    total_score: scoreMap.get(p.submission_id) ?? 0,
    confirmed_by: input.confirmed_by,
    confirmed_at: new Date().toISOString(),
  }));

  const { error: ie } = await supabase.from("shortlists").insert(rows);
  if (ie) throw new InternalError(ie.message);

  // Mark submissions as shortlisted
  await supabase.from("submissions")
    .update({ status: "shortlisted", updated_at: new Date().toISOString() })
    .in("id", subIds);

  return rows;
}

export async function deliverShortlist(requestId: string, confirmedBy: string) {
  const now = new Date().toISOString();

  // Mark all shortlist entries as delivered
  const { error: se } = await supabase.from("shortlists")
    .update({ delivered_at: now })
    .eq("job_request_id", requestId);
  if (se) throw new InternalError(se.message);

  // Update request status to shortlisted
  const { data, error } = await supabase.from("job_requests")
    .update({ status: "shortlisted", updated_at: now })
    .eq("id", requestId).select().single();
  if (error) throw new InternalError(error.message);

  // Get request deposit to calculate settlement
  const req = data as any;
  const scored = await supabase.from("submissions")
    .select("id").eq("job_request_id", requestId).eq("status", "shortlisted");
  const scoredCount = scored.data?.length ?? 0;

  // Settlement: final_charge = admin_fee + scored_count * unit_price
  const UNIT_PRICE = 180000;
  const finalCharge = (req.admin_fee ?? 0) + scoredCount * UNIT_PRICE;
  const creditReturned = Math.max(0, (req.deposit_amount ?? 0) - finalCharge);

  await supabase.from("job_requests")
    .update({ final_charge: finalCharge }).eq("id", requestId);

  // Create settlement record
  await supabase.from("settlement_records").insert({
    job_request_id: requestId,
    employer_id: req.employer_id,
    deposit_paid: req.deposit_amount ?? 0,
    final_charge: finalCharge,
    credit_returned: creditReturned,
    settled_at: now,
  });

  return { request: data, final_charge: finalCharge, credit_returned: creditReturned };
}

export async function getEmployerShortlists(employerId: string) {
  const { data, error } = await supabase.from("job_requests").select(`
    id, title, role_type, shortlist_size, status,
    shortlists(
      id, rank, total_score, confirmed_at, delivered_at,
      users!candidate_id(id, email, first_name, last_name, avatar_url),
      submissions!submission_id(
        id, artifact_urls, submission_statement, reviewer_notes, total_score,
        submission_scores(criterion_title, weight, score_percent)
      )
    )
  `).eq("employer_id", employerId)
    .eq("status", "shortlisted")
    .order("created_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getEmployerShortlist(requestId: string, employerId: string) {
  const { data, error } = await supabase.from("job_requests").select(`
    id, title, role_type, role_level, shortlist_size, status,
    deposit_amount, final_charge, published_at,
    shortlists(
      id, rank, total_score, confirmed_at, delivered_at,
      users!candidate_id(id, email, first_name, last_name, avatar_url),
      submissions!submission_id(
        id, artifact_urls, submission_statement, reviewer_notes, total_score,
        submission_scores(criterion_title, weight, score_percent)
      )
    )
  `).eq("id", requestId).eq("employer_id", employerId).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}
