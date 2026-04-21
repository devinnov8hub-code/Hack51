import { Hono } from "hono";
import { AdminController } from "../controllers/admin.controller.js";
import { AdminDashboard, NotificationController } from "../controllers/dashboard.controller.js";
import { CatalogController } from "../controllers/catalog.controller.js";
import { ReviewController } from "../controllers/review.controller.js";
import { ProfileController } from "../controllers/profile.controller.js";
import { WalletController } from "../controllers/wallet.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { authRateLimit, strictRateLimit } from "../middleware/rate-limit.middleware.js";
import { LoginSchema, CreateAdminSchema } from "../dto/auth.dto.js";
import {
  CreateRoleSchema, UpdateRoleSchema,
  CreateChallengeSchema, UpdateChallengeSchema,
  ReviewProposalSchema,
} from "../dto/catalog.dto.js";
import { TriageSchema, ScoreSchema, ConfirmShortlistSchema, UpdateProfileSchema } from "../dto/request.dto.js";
import { UserRole } from "../enumerations/UserRole.js";

export const adminRouter = new Hono();

const isAdmin    = requireRole(UserRole.ADMIN_REVIEWER, UserRole.ADMIN_LEAD, UserRole.SYSTEM_ADMIN);
const isLead     = requireRole(UserRole.ADMIN_LEAD, UserRole.SYSTEM_ADMIN);
const isSysAdmin = requireRole(UserRole.SYSTEM_ADMIN);

// ── Public ────────────────────────────────────────────────────────────────────
adminRouter.post("/auth/login", authRateLimit, validateBody(LoginSchema), AdminController.login);

// ── Auth ──────────────────────────────────────────────────────────────────────
adminRouter.get( "/auth/me",     authMiddleware, isAdmin, AdminController.getMe);
adminRouter.post("/auth/create", strictRateLimit, authMiddleware, isSysAdmin, validateBody(CreateAdminSchema), AdminController.createAdmin);

// ── Profile & Settings ────────────────────────────────────────────────────────
adminRouter.get(  "/profile", authMiddleware, isAdmin, ProfileController.getProfile);
adminRouter.patch("/profile", authMiddleware, isAdmin, validateBody(UpdateProfileSchema), ProfileController.updateProfile);

// ── Dashboard ─────────────────────────────────────────────────────────────────
adminRouter.get("/dashboard", authMiddleware, isAdmin, AdminDashboard.overview);

// ── Users Management (system admin only) ──────────────────────────────────────
adminRouter.get(  "/users",                       authMiddleware, isSysAdmin, AdminDashboard.listUsers);
adminRouter.patch("/users/:userId/toggle-active", authMiddleware, isSysAdmin, AdminDashboard.toggleUserActive);

// ── Catalog: Roles ────────────────────────────────────────────────────────────
adminRouter.get(   "/catalog/roles",     authMiddleware, isAdmin, CatalogController.listRoles);
adminRouter.get(   "/catalog/roles/:id", authMiddleware, isAdmin, CatalogController.getRole);
adminRouter.post(  "/catalog/roles",     authMiddleware, isLead,  validateBody(CreateRoleSchema), CatalogController.createRole);
adminRouter.put(   "/catalog/roles/:id", authMiddleware, isLead,  validateBody(UpdateRoleSchema), CatalogController.updateRole);
adminRouter.delete("/catalog/roles/:id", authMiddleware, isLead,  CatalogController.deleteRole);

// ── Catalog: Challenges ───────────────────────────────────────────────────────
adminRouter.get(   "/catalog/challenges",     authMiddleware, isAdmin, CatalogController.listChallenges);
adminRouter.get(   "/catalog/challenges/:id", authMiddleware, isAdmin, CatalogController.getChallenge);
adminRouter.post(  "/catalog/challenges",     authMiddleware, isLead,  validateBody(CreateChallengeSchema), CatalogController.createChallenge);
adminRouter.put(   "/catalog/challenges/:id", authMiddleware, isLead,  validateBody(UpdateChallengeSchema), CatalogController.updateChallenge);
adminRouter.delete("/catalog/challenges/:id", authMiddleware, isLead,  CatalogController.deleteChallenge);

// ── Catalog: Proposal Review (employer-submitted) ─────────────────────────────
adminRouter.get( "/catalog/proposals/roles",                authMiddleware, isLead, CatalogController.listPendingRoleProposals);
adminRouter.post("/catalog/proposals/roles/:id/review",     authMiddleware, isLead, validateBody(ReviewProposalSchema), CatalogController.reviewRoleProposal);
adminRouter.get( "/catalog/proposals/challenges",           authMiddleware, isLead, CatalogController.listPendingChallengeProposals);
adminRouter.post("/catalog/proposals/challenges/:id/review", authMiddleware, isLead, validateBody(ReviewProposalSchema), CatalogController.reviewChallengeProposal);

// ── Review: Request Queue ─────────────────────────────────────────────────────
adminRouter.get("/review/requests",                        authMiddleware, isAdmin, ReviewController.listRequests);
adminRouter.get("/review/requests/:requestId/submissions", authMiddleware, isAdmin, ReviewController.listSubmissions);

// ── Review: Submissions ───────────────────────────────────────────────────────
adminRouter.get( "/review/submissions/:id",        authMiddleware, isAdmin, ReviewController.getSubmission);
adminRouter.post("/review/submissions/:id/triage", authMiddleware, isAdmin, validateBody(TriageSchema), ReviewController.triageSubmission);
adminRouter.post("/review/submissions/:id/score",  authMiddleware, isAdmin, validateBody(ScoreSchema),  ReviewController.scoreSubmission);

// ── Review: Shortlists ────────────────────────────────────────────────────────
adminRouter.get( "/review/shortlists",                        authMiddleware, isAdmin, ReviewController.listShortlists);
adminRouter.get( "/review/shortlists/:requestId/candidates",  authMiddleware, isAdmin, ReviewController.getScoredSubmissions);
adminRouter.post("/review/shortlists/:requestId/confirm",     authMiddleware, isLead,  validateBody(ConfirmShortlistSchema), ReviewController.confirmShortlist);
adminRouter.post("/review/shortlists/:requestId/deliver",     authMiddleware, isLead,  ReviewController.deliverShortlist);

// ── Wallet ────────────────────────────────────────────────────────────────────
adminRouter.get("/wallet", authMiddleware, isAdmin, WalletController.adminWallet);

// ── Notifications ─────────────────────────────────────────────────────────────
adminRouter.get( "/notifications",           authMiddleware, isAdmin, NotificationController.list);
adminRouter.post("/notifications/mark-read", authMiddleware, isAdmin, NotificationController.markRead);
