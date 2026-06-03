import { Hono } from "hono";
import { EmployerController } from "../controllers/employer.controller.js";
import { EmployerDashboard, NotificationController } from "../controllers/dashboard.controller.js";
import { JobRequestController } from "../controllers/job-request.controller.js";
import { ProfileController } from "../controllers/profile.controller.js";
import { PaymentController } from "../controllers/payment.controller.js";
import { CatalogController } from "../controllers/catalog.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";
import { RegisterSchema, LoginSchema, UpdateWorkspaceSchema } from "../dto/auth.dto.js";
import { CreateRequestSchema, UpdateRequestSchema, UpdateProfileSchema } from "../dto/request.dto.js";
import { ProposeRoleSchema, ProposeChallengeSchema } from "../dto/catalog.dto.js";
import { UserRole } from "../enumerations/UserRole.js";

export const employerRouter = new Hono();
const isEmployer = requireRole(UserRole.EMPLOYER);

// ── Public ────────────────────────────────────────────────────────────────────
employerRouter.post("/auth/register", authRateLimit, validateBody(RegisterSchema), EmployerController.register);
employerRouter.post("/auth/login",    authRateLimit, validateBody(LoginSchema),    EmployerController.login);

// ── Profile & Settings ────────────────────────────────────────────────────────
employerRouter.get(  "/profile", authMiddleware, isEmployer, ProfileController.getProfile);
employerRouter.patch("/profile", authMiddleware, isEmployer, validateBody(UpdateProfileSchema), ProfileController.updateProfile);

// ── Dashboard ─────────────────────────────────────────────────────────────────
employerRouter.get("/dashboard", authMiddleware, isEmployer, EmployerDashboard.overview);

// ── Workspace ─────────────────────────────────────────────────────────────────
employerRouter.get(  "/workspace", authMiddleware, isEmployer, EmployerController.getWorkspace);
employerRouter.patch("/workspace", authMiddleware, isEmployer, validateBody(UpdateWorkspaceSchema), EmployerController.updateWorkspace);

// ── Catalog browse (read-only) ────────────────────────────────────────────────
employerRouter.get("/catalog/roles",          authMiddleware, isEmployer, CatalogController.listEmployerRoles);
employerRouter.get("/catalog/challenges",     authMiddleware, isEmployer, CatalogController.listEmployerChallenges);
employerRouter.get("/catalog/challenges/:id", authMiddleware, isEmployer, CatalogController.getEmployerChallenge);

// ── Catalog propose (employer-submitted catalog additions) ────────────────────
employerRouter.post("/catalog/propose/role",      authMiddleware, isEmployer, validateBody(ProposeRoleSchema),      CatalogController.proposeRole);
employerRouter.post("/catalog/propose/challenge", authMiddleware, isEmployer, validateBody(ProposeChallengeSchema), CatalogController.proposeChallenge);

// ── Requests (Hiring Wizard) ──────────────────────────────────────────────────
employerRouter.post(  "/requests",                 authMiddleware, isEmployer, validateBody(CreateRequestSchema), JobRequestController.create);
employerRouter.get(   "/requests",                 authMiddleware, isEmployer, JobRequestController.list);
employerRouter.get(   "/requests/:id",             authMiddleware, isEmployer, JobRequestController.getOne);
employerRouter.patch( "/requests/:id",             authMiddleware, isEmployer, validateBody(UpdateRequestSchema), JobRequestController.update);
employerRouter.post(  "/requests/:id/publish",     authMiddleware, isEmployer, JobRequestController.publish);
employerRouter.delete("/requests/:id",             authMiddleware, isEmployer, JobRequestController.close);
// NEW: list submissions for a request (the missing endpoint)
employerRouter.get(   "/requests/:id/submissions", authMiddleware, isEmployer, JobRequestController.listSubmissions);
// NEW: rerun a previous request as a fresh draft
employerRouter.post(  "/requests/:id/rerun",       authMiddleware, isEmployer, JobRequestController.rerun);

// ── Shortlists ────────────────────────────────────────────────────────────────
employerRouter.get( "/shortlists",                  authMiddleware, isEmployer, JobRequestController.listShortlists);
employerRouter.get( "/shortlists/:id",              authMiddleware, isEmployer, JobRequestController.getShortlist);
// NEW: pay-to-unlock the full talent list (Figma screen 14)
employerRouter.post("/shortlists/:id/unlock",       authMiddleware, isEmployer, JobRequestController.unlockFullList);
// NEW: read the full candidate list once unlocked
employerRouter.get( "/shortlists/:id/full-list",    authMiddleware, isEmployer, JobRequestController.getFullCandidateList);
// NEW: download as CSV (returns text/csv, not JSON envelope)
employerRouter.get( "/shortlists/:id/export.csv",   authMiddleware, isEmployer, JobRequestController.exportShortlistCsv);

// ── Billing & Payments ────────────────────────────────────────────────────────
employerRouter.get( "/billing",                    authMiddleware, isEmployer, JobRequestController.getBilling);
// NEW: per-request billing breakdown (Figma screen 15 right)
employerRouter.get( "/billing/:id",                authMiddleware, isEmployer, JobRequestController.getBillingDetail);
employerRouter.post("/payments/initiate",          authMiddleware, isEmployer, PaymentController.initiate);
employerRouter.get( "/payments/verify/:reference", authMiddleware, isEmployer, PaymentController.verify);
employerRouter.get( "/payments/history",           authMiddleware, isEmployer, PaymentController.history);

// ── Notifications ─────────────────────────────────────────────────────────────
employerRouter.get( "/notifications",           authMiddleware, isEmployer, NotificationController.list);
employerRouter.post("/notifications/mark-read", authMiddleware, isEmployer, NotificationController.markRead);
