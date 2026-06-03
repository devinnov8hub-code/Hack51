/**
 * Admin auth + management Swagger doc definitions.
 * All routes require ADMIN_REVIEWER, ADMIN_LEAD, or SYSTEM_ADMIN role.
 */
export const adminDocs = {
  "/admin/auth/login": {
    post: {
      tags: ["Admin – Auth"],
      summary: "Admin login",
      description: "Login restricted to admin roles: admin_reviewer, admin_lead, system_admin. Returns access + refresh tokens.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" }, example: { email: "admin@hack51.com", password: "AdminPass1!" } } } },
      responses: { 200: { description: "Admin authenticated" }, 401: { description: "Invalid credentials" }, 403: { description: "Account is not an admin role (WRONG_ROLE_LOGIN)" } },
    },
  },
  "/admin/auth/create": {
    post: {
      tags: ["Admin – Auth"],
      summary: "Create admin account (SYSTEM_ADMIN only)",
      description: "Creates a pre-verified admin account. Sends a password reset OTP to the new admin's email so they can set their own password on first login.",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateAdminInput" }, example: { email: "reviewer@hack51.com", password: "TempPass1!", role: "admin_reviewer", first_name: "Jane" } } } },
      responses: { 201: { description: "Admin created, setup code emailed" }, 403: { description: "Only system_admin may create admin accounts" } },
    },
  },
  "/admin/auth/me": {
    get: {
      tags: ["Admin – Auth"],
      summary: "Get current admin profile",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Admin profile" }, 401: { description: "Unauthorized" } },
    },
  },
};
