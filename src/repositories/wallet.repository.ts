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
