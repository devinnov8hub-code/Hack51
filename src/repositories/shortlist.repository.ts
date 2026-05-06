import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError, BadRequestError } from "../exceptions/errors.js";
import * as notificationRepo from "./notification.repository.js";

/**
 * Admin: list all requests in evaluation/shortlisted/closed status.
 */
export async function getAdminShortlists() {
  const { data, error } = await supabase.from("job_requests").select(`
    id, title, role_type, role_level, status, shortlist_size,
    deposit_amount, final_charge, published_at,
    users!employer_id(email, first_name, last_name),
    workspaces(company_name)
  `).in("status", ["evaluating", "shortlisted", "closed"])
    .order("published_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

/**
 * Admin: list scored submissions for one request, ranked by total_score.
 * This is the candidate pool the admin picks from when confirming a shortlist.
 */
export async function getScoredSubmissionsForShortlist(requestId: string) {
  const { data, error } = await supabase.from("submissions").select(`
    id, total_score, status, submitted_at, scored_at,
    users!candidate_id(id, email, first_name, last_name, avatar_url),
    submission_scores(criterion_id, criterion_title, weight, score_percent)
  `).eq("job_request_id", requestId)
    .in("status", ["scored", "shortlisted"])
    .order("total_score", { ascending: false, nullsFirst: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

/**
 * Admin: confirm the top-N shortlist. Marks the selected submissions as
 * `shortlisted`. Replaces any previous selection for this request — last
 * call wins, so the admin can change their mind before delivery.
 *
 * Idempotent. Does NOT notify the employer (that happens at deliver time).
 */
export async function confirmShortlistSelections(
  requestId: string,
  selections: { candidate_id: string; submission_id: string; rank: number }[],
) {
  // Wipe any previous shortlist rows for this request
  await supabase.from("shortlists").delete().eq("job_request_id", requestId);

  // Reset all submissions on this request that were previously shortlisted
  // back to 'scored' so the new selection is the source of truth.
  await supabase.from("submissions")
    .update({ status: "scored", updated_at: new Date().toISOString() })
    .eq("job_request_id", requestId)
    .eq("status", "shortlisted");

  if (selections.length === 0) {
    throw new BadRequestError(
      "Cannot confirm an empty shortlist. Pick at least one candidate.",
      "EMPTY_SHORTLIST",
    );
  }

  const rows = selections.map((s) => ({
    job_request_id: requestId,
    candidate_id: s.candidate_id,
    submission_id: s.submission_id,
    rank: s.rank,
    confirmed_at: new Date().toISOString(),
    total_score: null, // populated by the trigger / on-deliver pass
  }));
  const { error: insErr } = await supabase.from("shortlists").insert(rows);
  if (insErr) throw new InternalError(insErr.message);

  const { error: updErr } = await supabase.from("submissions")
    .update({ status: "shortlisted", updated_at: new Date().toISOString() })
    .in("id", selections.map((s) => s.submission_id));
  if (updErr) throw new InternalError(updErr.message);

  return { confirmed_count: selections.length };
}

/**
 * Admin: deliver the confirmed shortlist to the employer.
 *
 * Pre-conditions:
 *   - The request must exist
 *   - The request must NOT already be in 'shortlisted' status (deliveries
 *     are one-shot)
 *   - At least one shortlist row must exist for this request, i.e. the
 *     admin must have called /confirm at least once with a non-empty
 *     selection. This is a critical guard that v1.2.3 added — without it,
 *     an admin could "deliver" an empty shortlist and the employer would
 *     receive a notification with nothing to look at.
 *
 * Side effects on success:
 *   - Stamps `delivered_at` on every shortlist row
 *   - Moves the request status to 'shortlisted'
 *   - Creates a settlement record (final_charge, credit_returned)
 *   - Sends an in-app notification to the employer
 */
export async function deliverShortlist(requestId: string) {
  // 1. Check the request exists and is in the right state
  const { data: req, error: reqErr } = await supabase
    .from("job_requests")
    .select("id, status, employer_id, title, deposit_amount, admin_fee, shortlist_size, challenge_cap")
    .eq("id", requestId)
    .maybeSingle();
  if (reqErr) throw new InternalError(reqErr.message);
  if (!req) throw new NotFoundError("Job request not found", "REQUEST_NOT_FOUND");

  if (req.status === "shortlisted") {
    throw new BadRequestError(
      "Shortlist has already been delivered for this request.",
      "ALREADY_DELIVERED",
    );
  }

  // 2. CRITICAL GUARD (v1.2.3): there must be confirmed shortlist rows
  //    before we can deliver. Otherwise the admin would be "delivering"
  //    nothing and the employer would get a notification with an empty list.
  const { data: confirmed, error: cErr } = await supabase
    .from("shortlists")
    .select("id, candidate_id, submission_id, rank")
    .eq("job_request_id", requestId);
  if (cErr) throw new InternalError(cErr.message);

  if (!confirmed || confirmed.length === 0) {
    throw new BadRequestError(
      "No candidates have been confirmed for this shortlist. " +
      "Call POST /admin/review/shortlists/:requestId/confirm with selections first.",
      "NO_CONFIRMED_SHORTLIST",
    );
  }

  // 3. Stamp delivered_at on every shortlist row
  const nowIso = new Date().toISOString();
  const { error: stampErr } = await supabase
    .from("shortlists")
    .update({ delivered_at: nowIso })
    .eq("job_request_id", requestId);
  if (stampErr) throw new InternalError(stampErr.message);

  // 4. Move the request to 'shortlisted'
  const { error: statusErr } = await supabase
    .from("job_requests")
    .update({ status: "shortlisted", updated_at: nowIso })
    .eq("id", requestId);
  if (statusErr) throw new InternalError(statusErr.message);

  // 5. Settlement: charge admin_fee + (delivered_count × per-candidate fee).
  //    Per-candidate fee is the same UNIT_PRICE used at deposit time.
  //    Anything left over goes back to the employer as credit.
  const ADMIN_FEE = Number(req.admin_fee ?? 800_000);
  const UNIT_PRICE = process.env.UNIT_PRICE_NGN
    ? Number(process.env.UNIT_PRICE_NGN)
    : 180_000;

  const finalCharge = ADMIN_FEE + confirmed.length * UNIT_PRICE;
  const deposit = Number(req.deposit_amount ?? 0);
  const creditReturned = Math.max(0, deposit - finalCharge);

  const { error: settleErr } = await supabase.from("settlement_records").insert({
    job_request_id: requestId,
    employer_id: req.employer_id,
    deposit_paid: deposit,
    final_charge: finalCharge,
    credit_returned: creditReturned,
    settled_at: nowIso,
  });
  if (settleErr) throw new InternalError(settleErr.message);

  // 6. Update job_requests.final_charge so the billing detail page renders correctly
  const { error: chargeErr } = await supabase
    .from("job_requests")
    .update({ final_charge: finalCharge })
    .eq("id", requestId);
  if (chargeErr) throw new InternalError(chargeErr.message);

  // 7. Notify the employer (best-effort — don't fail the call if notification fails)
  await notificationRepo.createNotification({
    user_id: req.employer_id,
    title: "Your shortlist is ready",
    body: `The shortlist for "${req.title}" has been delivered. ${confirmed.length} candidate${confirmed.length === 1 ? "" : "s"} selected. Credit returned: ₦${creditReturned.toLocaleString()}.`,
    type: "success",
    metadata: { job_request_id: requestId, final_charge: finalCharge, credit_returned: creditReturned },
  }).catch((err) => {
    console.error("[notification] failed to notify employer of shortlist delivery:", err);
  });

  // 8. Return the updated request + settlement summary
  const { data: updated, error: getErr } = await supabase
    .from("job_requests")
    .select("*, snapshot_challenge, snapshot_rubric")
    .eq("id", requestId)
    .single();
  if (getErr) throw new InternalError(getErr.message);

  return {
    request: updated,
    final_charge: finalCharge,
    credit_returned: creditReturned,
  };
}

/**
 * Employer: list every shortlist this employer has received.
 */
export async function getEmployerShortlists(employerId: string) {
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
  `).eq("employer_id", employerId)
    .eq("status", "shortlisted")
    .order("published_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

/**
 * Employer: full evidence pack for one shortlist (their own request only).
 */
export async function getEmployerShortlist(requestId: string, employerId: string) {
  const { data, error } = await supabase.from("job_requests").select(`
    id, title, role_type, role_level, shortlist_size, status,
    deposit_amount, final_charge, published_at,
    shortlists(
      id, rank, total_score, confirmed_at, delivered_at,
      users!candidate_id(id, email, first_name, last_name, avatar_url),
      submissions!submission_id(
        id, artifact_urls, submission_statement, reviewer_notes, total_score,
        submission_scores(criterion_id, criterion_title, weight, score_percent)
      )
    )
  `).eq("id", requestId)
    .eq("employer_id", employerId)
    .single();
  if (error?.code === "PGRST116") {
    throw new NotFoundError("Shortlist not found", "SHORTLIST_NOT_FOUND");
  }
  if (error) throw new InternalError(error.message);
  return data;
}
