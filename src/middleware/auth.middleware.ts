import type { Context, Next } from "hono";
import { verifyAccessToken } from "../utils/jwt.js";
import { UnauthorizedError, ForbiddenError } from "../exceptions/errors.js";
import { UserRole } from "../enumerations/UserRole.js";

declare module "hono" {
  interface ContextVariableMap {
    userId: string;
    userEmail: string;
    userRole: string;
  }
}

/**
 * Verifies the Bearer JWT and sets userId, userEmail, userRole on context.
 * Must be used as the FIRST middleware on protected routes.
 *
 * Usage on a route handler:
 *   router.get("/me", authMiddleware, myController.getMe);
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError(
      "Authorization header is missing or does not start with 'Bearer '",
      "MISSING_TOKEN"
    );
  }

  // Strip "Bearer " prefix — exactly 7 characters
  const token = authHeader.substring(7).trim();

  if (!token) {
    throw new UnauthorizedError("Token is empty", "MISSING_TOKEN");
  }

  // verifyAccessToken throws UnauthorizedError on invalid/expired token
  const payload = verifyAccessToken(token);

  c.set("userId", payload.sub);
  c.set("userEmail", payload.email);
  c.set("userRole", payload.role);

  await next();
}

/**
 * Role guard — call AFTER authMiddleware.
 * Checks c.get("userRole") is in the allowed list.
 *
 * Usage:
 *   router.get("/admin/thing", authMiddleware, requireRole(UserRole.SYSTEM_ADMIN), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const role = c.get("userRole");
    if (!roles.includes(role as UserRole)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${roles.join(" or ")}. Your role: ${role}`,
        "INSUFFICIENT_ROLE"
      );
    }
    await next();
  };
}

// ─── Pre-composed guards (convenience exports) ────────────────────────────────

const allAdminRoles = [UserRole.ADMIN_REVIEWER, UserRole.ADMIN_LEAD, UserRole.SYSTEM_ADMIN];

/** Any authenticated user */
export const authenticated = authMiddleware;

/** Candidate only */
export const candidateOnly = [authMiddleware, requireRole(UserRole.CANDIDATE)] as const;

/** Employer only */
export const employerOnly = [authMiddleware, requireRole(UserRole.EMPLOYER)] as const;

/** Any admin role */
export const adminOnly = [authMiddleware, requireRole(...allAdminRoles)] as const;

/** System admin only */
export const systemAdminOnly = [authMiddleware, requireRole(UserRole.SYSTEM_ADMIN)] as const;
