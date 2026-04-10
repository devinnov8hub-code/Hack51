/**
 * Employer auth + workspace Swagger doc definitions.
 */
export const employerDocs = {
  "/employer/auth/register": {
    post: {
      tags: ["Employer – Auth"],
      summary: "Register as an employer",
      description: "Shortcut to /auth/register with role pre-set to 'employer'. A workspace is created automatically after email verification.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterInput" }, example: { email: "cto@startup.com", password: "SecurePass1!", role: "employer", first_name: "John", last_name: "Doe" } } } },
      responses: { 201: { description: "Employer account created, OTP sent" }, 409: { description: "Email already exists" } },
    },
  },
  "/employer/auth/login": {
    post: {
      tags: ["Employer – Auth"],
      summary: "Employer login",
      description: "Login restricted to employer accounts only. Returns access + refresh tokens.",
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginInput" }, example: { email: "cto@startup.com", password: "SecurePass1!" } } } },
      responses: { 200: { description: "Employer authenticated" }, 401: { description: "Invalid credentials" }, 403: { description: "Not an employer account" } },
    },
  },
  "/employer/workspace": {
    get: {
      tags: ["Employer – Workspace"],
      summary: "Get employer workspace",
      security: [{ bearerAuth: [] }],
      responses: { 200: { description: "Workspace details" }, 404: { description: "Workspace not found" } },
    },
    patch: {
      tags: ["Employer – Workspace"],
      summary: "Update employer workspace details",
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateWorkspaceInput" }, example: { company_name: "Acme Corp", industry: "Technology", team_size: "11-50" } } } },
      responses: { 200: { description: "Workspace updated" }, 422: { description: "Validation error" } },
    },
  },
};
