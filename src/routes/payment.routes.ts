import { Hono } from "hono";
import { PaymentController } from "../controllers/payment.controller.js";

export const paymentRouter = new Hono();

// Paystack calls this directly — no auth token
paymentRouter.post("/webhook", PaymentController.webhook);
