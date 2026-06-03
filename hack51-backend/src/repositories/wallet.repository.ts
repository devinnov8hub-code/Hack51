import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";

export async function getAdminWalletSummary() {
  const [payments, settlements] = await Promise.all([
    supabase.from("payments").select("id, amount, status, created_at"),
    supabase.from("settlement_records").select("id, deposit_paid, final_charge, credit_returned, settled_at"),
  ]);
  if (payments.error) throw new InternalError(payments.error.message);
  if (settlements.error) throw new InternalError(settlements.error.message);

  const allPayments = payments.data ?? [];
  const allSettlements = settlements.data ?? [];

  const totalRevenue = allSettlements.reduce((s, r) => s + Number(r.final_charge), 0);
  const totalDeposits = allPayments.filter(p => p.status === "success").reduce((s, p) => s + Number(p.amount), 0);
  const totalCreditReturned = allSettlements.reduce((s, r) => s + Number(r.credit_returned), 0);

  return { totalRevenue, totalDeposits, totalCreditReturned, settlements: allSettlements, payments: allPayments };
}

export async function getAdminTransactions(filter?: "oldest" | "latest" | "successful" | "failed") {
  let q = supabase.from("payments").select(`
    id, amount, status, payment_reference, payment_type, created_at, paid_at,
    users!user_id(email, first_name, last_name),
    job_requests(id, title)
  `);
  if (filter === "oldest") q = q.order("created_at", { ascending: true });
  else if (filter === "successful") q = q.eq("status", "success").order("created_at", { ascending: false });
  else if (filter === "failed") q = q.eq("status", "failed").order("created_at", { ascending: false });
  else q = q.order("created_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getEmployerBilling(employerId: string) {
  const [requests, settlements, payments] = await Promise.all([
    supabase.from("job_requests").select("id, title, status, deposit_amount, final_charge")
      .eq("employer_id", employerId),
    supabase.from("settlement_records").select("*").eq("employer_id", employerId),
    supabase.from("payments").select("*").eq("user_id", employerId),
  ]);
  if (requests.error) throw new InternalError(requests.error.message);

  const totalSpent = (settlements.data ?? []).reduce((s, r) => s + Number(r.final_charge), 0);
  const totalCredit = (settlements.data ?? []).reduce((s, r) => s + Number(r.credit_returned), 0);

  return {
    summary: { total_spent: totalSpent, total_credit: totalCredit },
    requests: requests.data ?? [],
    settlements: settlements.data ?? [],
    payments: payments.data ?? [],
  };
}

/**
 * Per-request billing breakdown for the employer billing detail page
 * (Figma screen 15 right). Returns the line items + transaction status.
 */
export async function getEmployerBillingDetail(
  employerId: string,
  jobRequestId: string,
) {
  const [reqRes, settlementRes, paymentsRes] = await Promise.all([
    supabase.from("job_requests")
      .select(`id, title, status, challenge_cap, shortlist_size,
               admin_fee, deposit_amount, final_charge,
               published_at, created_at`)
      .eq("id", jobRequestId)
      .eq("employer_id", employerId)
      .maybeSingle(),
    supabase.from("settlement_records")
      .select("*")
      .eq("job_request_id", jobRequestId)
      .eq("employer_id", employerId)
      .maybeSingle(),
    supabase.from("payments")
      .select("*")
      .eq("user_id", employerId)
      .eq("job_request_id", jobRequestId)
      .order("created_at", { ascending: true }),
  ]);

  if (reqRes.error) throw new InternalError(reqRes.error.message);
  if (!reqRes.data) {
    throw new InternalError("Job request not found or not yours.");
  }
  if (paymentsRes.error) throw new InternalError(paymentsRes.error.message);

  const req = reqRes.data as any;
  const settlement = settlementRes.data as any | null;
  const payments = (paymentsRes.data ?? []) as any[];

  // Group payments by type so the frontend can render "Admin Setup Fee",
  // "Prepaid Deposit", "Full candidate list purchase" line items in Figma.
  const depositPayment = payments.find((p) => p.payment_type === "deposit");
  const unlockPayment = payments.find((p) => p.payment_type === "full_list_unlock");

  const totalPaid = payments
    .filter((p) => p.status === "success")
    .reduce((s, p) => s + Number(p.amount), 0);

  return {
    request: {
      id: req.id,
      title: req.title,
      status: req.status,
      challenge_cap: req.challenge_cap,
      shortlist_size: req.shortlist_size,
    },
    line_items: {
      admin_setup_fee: req.admin_fee ?? 0,
      prepaid_deposit: req.deposit_amount ?? 0,
      final_charge: req.final_charge ?? null,
      credit_returned: settlement?.credit_returned ?? null,
      full_list_unlock: unlockPayment ? Number(unlockPayment.amount) : null,
    },
    transactions: payments.map((p) => ({
      id: p.id,
      payment_reference: p.payment_reference,
      payment_type: p.payment_type,
      amount: p.amount,
      status: p.status,
      paid_at: p.paid_at,
      created_at: p.created_at,
    })),
    total_paid: totalPaid,
    settlement,
  };
}
