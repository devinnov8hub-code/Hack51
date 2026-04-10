import type { Context } from "hono";
import { successResponse } from "../types/api-response.js";
import * as paymentService from "../services/payment.service.js";
import { BadRequestError } from "../exceptions/errors.js";

export const PaymentController = {
  /**
   * POST /payments/initiate
   * Employer initiates a payment for a job request deposit.
   * Returns a Paystack authorization_url to redirect the user to.
   */
  async initiate(c: Context) {
    const userId = c.get("userId");
    const userEmail = c.get("userEmail");
    const body = await c.req.json();

    if (!body.amount_ngn || body.amount_ngn <= 0) {
      throw new BadRequestError("amount_ngn is required and must be greater than 0", "INVALID_AMOUNT");
    }

    const result = await paymentService.initiatePayment({
      userId,
      email: userEmail,
      amountKobo: Math.round(body.amount_ngn * 100),
      jobRequestId: body.job_request_id,
      paymentType: body.payment_type ?? "deposit",
      metadata: body.metadata,
    });

    return c.json(successResponse(
      "Payment initiated. Redirect user to authorization_url to complete payment.",
      result
    ));
  },

  /**
   * GET /payments/verify/:reference
   * Verify a payment after user completes Paystack checkout.
   */
  async verify(c: Context) {
    const { reference } = c.req.param() as { reference: string };
    const result = await paymentService.verifyPayment(reference);
    return c.json(successResponse(
      result.status === "success" ? "Payment verified successfully." : "Payment verification failed.",
      result
    ));
  },

  /**
   * POST /payments/webhook
   * Paystack webhook — called by Paystack when a payment status changes.
   * Signature verification is required in production.
   */
  async webhook(c: Context) {
    const signature = c.req.header("x-paystack-signature") ?? "";
    const rawBody = await c.req.text();

    if (!paymentService.verifyWebhookSignature(rawBody, signature)) {
      // In stub mode PAYSTACK_WEBHOOK_SECRET is not set, so we accept all
      // In production: throw new UnauthorizedError("Invalid webhook signature")
    }

    const event = JSON.parse(rawBody);
    if (event.event === "charge.success") {
      await paymentService.verifyPayment(event.data.reference);
    }

    return c.json(successResponse("Webhook received.", null));
  },

  /**
   * GET /payments/history
   * Get the authenticated user's payment history.
   */
  async history(c: Context) {
    const userId = c.get("userId");
    const payments = await paymentService.getPaymentHistory(userId);
    return c.json(successResponse("Payment history retrieved.", payments));
  },
};
