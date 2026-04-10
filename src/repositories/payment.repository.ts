import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";

export interface PaymentRow {
  id: string;
  user_id: string;
  job_request_id: string | null;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  payment_reference: string | null;
  paystack_id: string | null;
  payment_type: string;
  metadata: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPaymentRecord(input: {
  user_id: string;
  job_request_id?: string;
  amount: number;
  currency?: string;
  payment_type?: string;
  payment_reference: string;
}): Promise<PaymentRow> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      user_id: input.user_id,
      job_request_id: input.job_request_id ?? null,
      amount: input.amount,
      currency: input.currency ?? "NGN",
      payment_type: input.payment_type ?? "deposit",
      payment_reference: input.payment_reference,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw new InternalError(`Failed to create payment record: ${error.message}`);
  return data as PaymentRow;
}

export async function updatePaymentStatus(
  reference: string,
  status: "success" | "failed" | "refunded",
  paystackId?: string
): Promise<PaymentRow> {
  const { data, error } = await supabase
    .from("payments")
    .update({
      status,
      paystack_id: paystackId ?? null,
      paid_at: status === "success" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_reference", reference)
    .select()
    .single();
  if (error) throw new InternalError(`Failed to update payment: ${error.message}`);
  return data as PaymentRow;
}

export async function findPaymentsByUser(userId: string): Promise<PaymentRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new InternalError(`Failed to fetch payments: ${error.message}`);
  return (data ?? []) as PaymentRow[];
}

export async function findPaymentByReference(reference: string): Promise<PaymentRow | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("payment_reference", reference)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new InternalError(`Failed to find payment: ${error.message}`);
  return data as PaymentRow;
}
