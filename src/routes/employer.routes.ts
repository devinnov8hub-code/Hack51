import { Hono } from "hono";
import { EmployerController } from "../controllers/employer.controller.js";
import { EmployerDashboard, NotificationController } from "../controllers/dashboard.controller.js";
import { JobRequestController } from "../controllers/job-request.controller.js";
import { ProfileController } from "../controllers/profile.controller.js";
import { PaymentController } from "../controllers/payment.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";
import { authRateLimit } from "../middleware/rate-limit.middleware.js";
import { RegisterSchema, LoginSchema, UpdateWorkspaceSchema } from "../dto/auth.dto.js";
import { CreateRequestSchema, UpdateRequestSchema, UpdateProfileSchema } from "../dto/request.dto.js";
import { UserRole } from "../enumerations/UserRole.js";

export const employerRouter = new Hono();
const isEmployer = requireRole(UserRole.EMPLOYER);

// ── Public ────────────────────────────────────────────────────────────────────
employerRouter.post("/auth/register", authRateLimit, validateBody(RegisterSchema), EmployerController.register);
employerRouter.post("/auth/login",    authRateLimit, validateBody(LoginSchema),    EmployerController.login);

// ── Profile & Settings ────────────────────────────────────────────────────────
employerRouter.get(  "/profile",  authMiddleware, isEmployer, ProfileController.getProfile);
employerRouter.patch("/profile",  authMiddleware, isEmployer, validateBody(UpdateProfileSchema), ProfileController.updateProfile);

// ── Dashboard ─────────────────────────────────────────────────────────────────
employerRouter.get("/dashboard", authMiddleware, isEmployer, EmployerDashboard.overview);

// ── Workspace ─────────────────────────────────────────────────────────────────
employerRouter.get(  "/workspace", authMiddleware, isEmployer, EmployerController.getWorkspace);
employerRouter.patch("/workspace", authMiddleware, isEmployer, validateBody(UpdateWorkspaceSchema), EmployerController.updateWorkspace);

// ── Catalog (read-only: employers browse to pick challenges) ──────────────────
employerRouter.get("/catalog/roles",          authMiddleware, isEmployer, async (c) => {
  const { listCatalogRoles } = await import("../repositories/catalog.repository.js");
  const { successResponse } = await import("../types/api-response.js");
  const data = await listCatalogRoles(true);
  return c.json(successResponse("Roles retrieved.", data));
});
employerRouter.get("/catalog/challenges",     authMiddleware, isEmployer, async (c) => {
  const { listChallenges } = await import("../repositories/catalog.repository.js");
  const { successResponse } = await import("../types/api-response.js");
  const data = await listChallenges(true);
  return c.json(successResponse("Challenges retrieved.", data));
});
employerRouter.get("/catalog/challenges/:id", authMiddleware, isEmployer, async (c) => {
  const { getChallenge } = await import("../repositories/catalog.repository.js");
  const { successResponse } = await import("../types/api-response.js");
  const id = c.req.param("id") ?? "";
  const data = await getChallenge(id);
  return c.json(successResponse("Challenge retrieved.", data));
});

// ── Requests (Hiring Wizard) ──────────────────────────────────────────────────
employerRouter.post(  "/requests",             authMiddleware, isEmployer, validateBody(CreateRequestSchema), JobRequestController.create);
employerRouter.get(   "/requests",             authMiddleware, isEmployer, JobRequestController.list);
employerRouter.get(   "/requests/:id",         authMiddleware, isEmployer, JobRequestController.getOne);
employerRouter.patch( "/requests/:id",         authMiddleware, isEmployer, validateBody(UpdateRequestSchema), JobRequestController.update);
employerRouter.post(  "/requests/:id/publish", authMiddleware, isEmployer, JobRequestController.publish);
employerRouter.delete("/requests/:id",         authMiddleware, isEmployer, JobRequestController.close);

// ── Shortlists ────────────────────────────────────────────────────────────────
employerRouter.get("/shortlists",      authMiddleware, isEmployer, JobRequestController.listShortlists);
employerRouter.get("/shortlists/:id",  authMiddleware, isEmployer, JobRequestController.getShortlist);

// ── Billing & Payments ────────────────────────────────────────────────────────
employerRouter.get( "/billing",                      authMiddleware, isEmployer, JobRequestController.getBilling);
employerRouter.post("/payments/initiate",             authMiddleware, isEmployer, PaymentController.initiate);
employerRouter.get( "/payments/verify/:reference",   authMiddleware, isEmployer, PaymentController.verify);
employerRouter.get( "/payments/history",             authMiddleware, isEmployer, PaymentController.history);

// ── Notifications ─────────────────────────────────────────────────────────────
employerRouter.get( "/notifications",           authMiddleware, isEmployer, NotificationController.list);
employerRouter.post("/notifications/mark-read", authMiddleware, isEmployer, NotificationController.markRead);
