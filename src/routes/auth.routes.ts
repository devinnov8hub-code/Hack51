import { Hono } from "hono";
import { AuthController } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authRateLimit, otpRateLimit, strictRateLimit } from "../middleware/rate-limit.middleware.js";
import {
  RegisterSchema, VerifyOtpSchema, ResendOtpSchema, LoginSchema,
  ForgotPasswordSchema, VerifyResetOtpSchema, ResetPasswordSchema,
  RefreshTokenSchema, LogoutSchema,
} from "../dto/auth.dto.js";

export const authRouter = new Hono();

// ── Public ────────────────────────────────────────────────────────────────────
authRouter.post("/register",          authRateLimit,   validateBody(RegisterSchema),        AuthController.register);
authRouter.post("/verify-email",      otpRateLimit,    validateBody(VerifyOtpSchema),       AuthController.verifyEmail);
authRouter.post("/resend-otp",        otpRateLimit,    validateBody(ResendOtpSchema),       AuthController.resendOtp);
authRouter.post("/login",             authRateLimit,   validateBody(LoginSchema),           AuthController.login);
authRouter.post("/refresh",           authRateLimit,   validateBody(RefreshTokenSchema),    AuthController.refresh);
authRouter.post("/logout",            authRateLimit,   validateBody(LogoutSchema),          AuthController.logout);
authRouter.post("/forgot-password",   strictRateLimit, validateBody(ForgotPasswordSchema),  AuthController.forgotPassword);
authRouter.post("/verify-reset-otp",  otpRateLimit,    validateBody(VerifyResetOtpSchema),  AuthController.verifyResetOtp);
authRouter.post("/reset-password",    strictRateLimit, validateBody(ResetPasswordSchema),   AuthController.resetPassword);

// ── Protected ─────────────────────────────────────────────────────────────────
// authMiddleware goes INLINE on the route — this is the correct Hono pattern
authRouter.get("/me", authMiddleware, AuthController.getMe);
