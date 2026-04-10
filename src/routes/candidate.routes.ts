import { Hono } from "hono";
import { CandidateController } from "../controllers/candidate.controller.js";
import { CandidateDashboard, NotificationController } from "../controllers/dashboard.controller.js";
import { SubmissionController } from "../controllers/submission.controller.js";
import { ProfileController } from "../controllers/profile.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";
import { RegisterSchema, LoginSchema, UpdateCandidateProfileSchema } from "../dto/auth.dto.js";
import { SubmitSchema, UpdateProfileSchema } from "../dto/request.dto.js";
import { UserRole } from "../enumerations/UserRole.js";

export const candidateRouter = new Hono();
const isCandidate = requireRole(UserRole.CANDIDATE);

// ── Public ────────────────────────────────────────────────────────────────────
candidateRouter.post("/auth/register", authRateLimit, validateBody(RegisterSchema), CandidateController.register);
candidateRouter.post("/auth/login",    authRateLimit, validateBody(LoginSchema),    CandidateController.login);

// ── Public: Browse open challenges (no auth required) ─────────────────────────
candidateRouter.get("/challenges",     SubmissionController.listOpenChallenges);
candidateRouter.get("/challenges/:id", SubmissionController.getChallengeDetail);

// ── Profile & Settings ────────────────────────────────────────────────────────
candidateRouter.get(  "/profile",  authMiddleware, isCandidate, CandidateController.getProfile);
candidateRouter.patch("/profile",  authMiddleware, isCandidate, validateBody(UpdateCandidateProfileSchema), CandidateController.updateProfile);
candidateRouter.patch("/settings", authMiddleware, isCandidate, validateBody(UpdateProfileSchema), ProfileController.updateProfile);

// ── Dashboard ─────────────────────────────────────────────────────────────────
candidateRouter.get("/dashboard",             authMiddleware, isCandidate, CandidateDashboard.overview);

// ── Submissions ───────────────────────────────────────────────────────────────
candidateRouter.post("/challenges/:id/submit", authMiddleware, isCandidate, validateBody(SubmitSchema), SubmissionController.submit);
candidateRouter.get( "/submissions",           authMiddleware, isCandidate, SubmissionController.mySubmissions);
candidateRouter.get( "/submissions/:id",       authMiddleware, isCandidate, SubmissionController.getMySubmission);

// ── Notifications ─────────────────────────────────────────────────────────────
candidateRouter.get( "/notifications",           authMiddleware, isCandidate, NotificationController.list);
candidateRouter.post("/notifications/mark-read", authMiddleware, isCandidate, NotificationController.markRead);
