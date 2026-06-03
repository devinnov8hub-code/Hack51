/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Hack51 — Payment Service (Paystack Integration)
 *
 * STATUS: STUBBED — integration not yet active.
 *
 * When you're ready to activate Paystack:
 *   1. Add PAYSTACK_SECRET_KEY to .env
 *   2. Uncomment the Paystack API calls below
 *   3. Add PAYSTACK_WEBHOOK_SECRET to .env for webhook verification
 *   4. Wire up the /payments/webhook endpoint
 *
 * Paystack docs: https://paystack.com/docs/api
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as paymentRepo from "../repositories/payment.repository.js";
import { BadRequestError, NotFoundError } from "../exceptions/errors.js";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

// const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
// const PAYSTACK_BASE   = "https://api.paystack.co";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitiatePaymentInput {
  userId: string;
  email: string;
  amountKobo: number;         // Paystack uses kobo (NGN × 100)
  jobRequestId?: string;
  paymentType?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResult {
  payment_reference: string;
  authorization_url: string;  // redirect the user here (Paystack hosted checkout)
  access_code: string;
}

export interface VerifyPaymentResult {
  reference: string;
  status: "success" | "failed";
  amount: number;
  currency: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReference(): string {
  return `H51-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Initiate a Paystack payment.
 * Creates a payment record (pending) and returns the Paystack authorization URL.
 *
 * STUB: returns a mock response until Paystack credentials are configured.
 */
export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResult> {
  const reference = generateReference();

  // Create a pending payment record in the database
  await paymentRepo.createPaymentRecord({
    user_id: input.userId,
    job_request_id: input.jobRequestId,
    amount: input.amountKobo / 100,    // store in NGN, not kobo
    currency: "NGN",
    payment_type: input.paymentType ?? "deposit",
    payment_reference: reference,
  });

  // ── STUB RESPONSE ──────────────────────────────────────────────────────────
  // Replace this block with the real Paystack API call when ready:
  //
  // const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
  //   method: "POST",
  //   headers: {
  //     Authorization: `Bearer ${PAYSTACK_SECRET}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     email: input.email,
  //     amount: input.amountKobo,
  //     reference,
  //     metadata: input.metadata ?? {},
  //   }),
  // });
  // const json = await res.json();
  // return {
  //   payment_reference: reference,
  //   authorization_url: json.data.authorization_url,
  //   access_code: json.data.access_code,
  // };

  return {
    payment_reference: reference,
    authorization_url: `https://checkout.paystack.com/stub_${reference}`,
    access_code: `stub_access_${reference}`,
  };
}

/**
 * Verify a Paystack payment by reference.
 * Call this after the user completes checkout or from the webhook handler.
 *
 * STUB: marks all payments as "success" until Paystack is activated.
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  const payment = await paymentRepo.findPaymentByReference(reference);
  if (!payment) throw new NotFoundError("Payment record not found", "PAYMENT_NOT_FOUND");

  // ── STUB ───────────────────────────────────────────────────────────────────
  // Replace with real Paystack verification:
  //
  // const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
  //   headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  // });
  // const json = await res.json();
  // const status = json.data.status === "success" ? "success" : "failed";
  // await paymentRepo.updatePaymentStatus(reference, status, json.data.id?.toString());
  // return { reference, status, amount: json.data.amount / 100, currency: json.data.currency };

  await paymentRepo.updatePaymentStatus(reference, "success", `stub_ps_${Date.now()}`);
  return {
    reference,
    status: "success",
    amount: payment.amount,
    currency: payment.currency,
  };
}

/**
 * Verify a Paystack webhook signature.
 * Use this in the POST /payments/webhook handler.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET ?? "";
  if (!secret) return false; // not configured yet
  const hash = createHash("sha512").update(body).update(secret).digest("hex");
  return hash === signature;
}

export async function getPaymentHistory(userId: string) {
  return paymentRepo.findPaymentsByUser(userId);
}
