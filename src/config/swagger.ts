import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

const openApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Hack51 API",
    version: "1.0.0",
    description: `## Evidence-Based Hiring Platform — Complete API

### How to use Bearer auth in Swagger
1. Call \`POST /auth/login\` (or role-specific login) → copy **access_token** from the response \`data\` field
2. Click ** Authorize** button (top right of this page)
3. Paste ONLY the token — **not** "Bearer", not the password — into the **bearerAuth** field
   -  \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`
   -  \`Bearer eyJ...\` or \`$2b$12$...\` (that last one is a bcrypt hash, not a JWT)
4. Click **Authorize → Close**

### Default system admin credentials
- **Email:** admin@hack51.com
- **Password:** Admin@Hack51!
- ⚠ Change this immediately via \`PATCH /admin/profile\`

### Global response format
Every endpoint returns:
\`\`\`json
{ "status": "success|error", "message": "...", "data": {}, "error": null }
\`\`\`
`,
  },
  servers: [{ url: "/", description: "Current environment" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http", scheme: "bearer", bearerFormat: "JWT",
        description: "Paste ONLY the access_token from the login response (no 'Bearer ' prefix)",
      },
    },
  },
  tags: [
    { name: "Auth", description: "Shared auth endpoints — register, verify, login, refresh, reset password" },
    { name: "Admin – Auth", description: "Admin login and account management" },
    { name: "Admin – Dashboard", description: "Admin overview statistics" },
    { name: "Admin – Catalog", description: "Manage roles and challenges" },
    { name: "Admin – Review", description: "Submission triage, scoring, and shortlist delivery" },
    { name: "Admin – Wallet", description: "Revenue and transaction overview" },
    { name: "Admin – Profile", description: "Admin profile settings" },
    { name: "Employer – Auth", description: "Employer registration and login" },
    { name: "Employer – Dashboard", description: "Employer overview" },
    { name: "Employer – Requests", description: "Create and manage hiring requests" },
    { name: "Employer – Shortlists", description: "View delivered shortlists with evidence packs" },
    { name: "Employer – Billing", description: "Billing, deposit, and settlement records" },
    { name: "Employer – Workspace", description: "Workspace/company profile" },
    { name: "Candidate – Auth", description: "Candidate registration and login" },
    { name: "Candidate – Challenges", description: "Browse and view open challenges (public)" },
    { name: "Candidate – Submissions", description: "Submit to challenges and track status" },
    { name: "Candidate – Profile", description: "Candidate profile management" },
    { name: "Shared – Auth", description: "Shared token refresh, logout, me endpoints" },
    { name: "Payments", description: "Paystack payment integration (stub — activate with PAYSTACK_SECRET_KEY)" },
  ],
  paths: {
    // ── HEALTH ───────────────────────────────────────────────────────────────
    "/health": { get: { tags: ["Auth"], summary: "Health check", responses: { 200: { description: "OK" } } } },

    // ── SHARED AUTH ───────────────────────────────────────────────────────────
    "/auth/register":         { post: { tags: ["Auth"], summary: "Register (candidate or employer)", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } }, responses: { 201: { description: "Account created, OTP sent" }, 409: { description: "Email already exists" } } } },
    "/auth/verify-email":     { post: { tags: ["Auth"], summary: "Verify email with 6-digit OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "482913" } } } }, responses: { 200: { description: "Verified" }, 400: { description: "Invalid OTP" } } } },
    "/auth/resend-otp":       { post: { tags: ["Auth"], summary: "Resend verification OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "OTP resent" } } } },
    "/auth/login":            { post: { tags: ["Auth"], summary: "Login (any role)", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "access_token + refresh_token returned in data" } } } },
    "/auth/refresh":          { post: { tags: ["Shared – Auth"], summary: "Rotate refresh token", requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "New token pair" } } } },
    "/auth/logout":           { post: { tags: ["Shared – Auth"], summary: "Logout (revoke refresh token)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "Logged out" } } } },
    "/auth/forgot-password":  { post: { tags: ["Auth"], summary: "Request password reset OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "OTP sent if email registered" } } } },
    "/auth/verify-reset-otp": { post: { tags: ["Auth"], summary: "Verify reset OTP → get reset_token", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "391045" } } } }, responses: { 200: { description: "reset_token returned" } } } },
    "/auth/reset-password":   { post: { tags: ["Auth"], summary: "Set new password using reset_token", requestBody: { required: true, content: { "application/json": { example: { reset_token: "eyJ...", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Password changed, all sessions revoked" } } } },
    "/auth/me":               { get: { tags: ["Shared – Auth"], summary: "Get current user (any role)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Current user profile" } } } },

    // ── ADMIN AUTH ────────────────────────────────────────────────────────────
    "/admin/auth/login":   { post: { tags: ["Admin – Auth"], summary: "Admin login (admin roles only)", requestBody: { required: true, content: { "application/json": { example: { email: "admin@hack51.com", password: "Admin@Hack51!" } } } }, responses: { 200: { description: "Tokens + user in data" }, 403: { description: "Not an admin role" } } } },
    "/admin/auth/me":      { get:  { tags: ["Admin – Auth"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Admin user object" } } } },
    "/admin/auth/create":  { post: { tags: ["Admin – Auth"], summary: "Create admin account (SYSTEM_ADMIN only)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { email: "reviewer@hack51.com", password: "SecurePass1!", role: "admin_reviewer", first_name: "Jane" } } } }, responses: { 201: { description: "Admin created, setup OTP emailed" } } } },

    // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
    "/admin/dashboard": { get: { tags: ["Admin – Dashboard"], summary: "Overview: submissions, requests, revenue stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard stats" } } } },

    // ── ADMIN CATALOG ─────────────────────────────────────────────────────────
    "/admin/catalog/roles":        { get: { tags: ["Admin – Catalog"], summary: "List all roles", security: [{ bearerAuth: [] }], responses: { 200: { description: "Roles list" } } }, post: { tags: ["Admin – Catalog"], summary: "Create a new role", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { name: "Software Engineer", description: "Full-stack engineer role", skill_levels: ["entry-level", "mid-level", "senior"], capabilities: [{ title: "API Design", summary: "Design RESTful APIs" }] } } } }, responses: { 201: { description: "Role created" } } } },
    "/admin/catalog/roles/{id}":   { get: { tags: ["Admin – Catalog"], summary: "Get role with challenges and rubric", security: [{ bearerAuth: [] }], responses: { 200: { description: "Role detail" } } }, put: { tags: ["Admin – Catalog"], summary: "Update role", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { name: "Updated Name", is_active: true } } } }, responses: { 200: { description: "Updated" } } }, delete: { tags: ["Admin – Catalog"], summary: "Delete role (and all challenges)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } } },
    "/admin/catalog/challenges":   { get: { tags: ["Admin – Catalog"], summary: "List all challenges", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenges" } } }, post: { tags: ["Admin – Catalog"], summary: "Create challenge with rubric (weights must = 100)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { catalog_role_id: "uuid", title: "API Optimization Challenge", summary: "Improve a sluggish REST API", scenario: "Your team manages...", deliverables: ["Source code repo", "README"], submission_format: "Single ZIP or GitHub link", rubric_criteria: [{ title: "Code Quality", weight: 30 }, { title: "Code Technicality", weight: 30 }, { title: "Code Functionality", weight: 40 }] } } } }, responses: { 201: { description: "Challenge created" } } } },
    "/admin/catalog/challenges/{id}": { get: { tags: ["Admin – Catalog"], summary: "Get challenge detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge with rubric" } } }, put: { tags: ["Admin – Catalog"], summary: "Update challenge and rubric", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } }, delete: { tags: ["Admin – Catalog"], summary: "Delete challenge", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } } },

    // ── ADMIN REVIEW ──────────────────────────────────────────────────────────
    "/admin/review/requests":                          { get: { tags: ["Admin – Review"], summary: "Active request queue (filter: ?status=published|evaluating|shortlisted)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Queue" } } } },
    "/admin/review/requests/{requestId}/submissions":  { get: { tags: ["Admin – Review"], summary: "All submissions for a request", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submissions + stats" } } } },
    "/admin/review/submissions/{id}":                  { get: { tags: ["Admin – Review"], summary: "Single submission with rubric snapshot", security: [{ bearerAuth: [] }], responses: { 200: { description: "Full submission" } } } },
    "/admin/review/submissions/{id}/triage":           { post: { tags: ["Admin – Review"], summary: "Triage: valid | invalid | returned", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { decision: "valid", reason: "All deliverables submitted and format correct" } } } }, responses: { 200: { description: "Triaged" } } } },
    "/admin/review/submissions/{id}/score":            { post: { tags: ["Admin – Review"], summary: "Score submission against rubric criteria", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { scores: [{ criterion_id: "uuid", criterion_title: "Code Quality", weight: 30, score_percent: 85 }, { criterion_id: "uuid2", criterion_title: "Code Technicality", weight: 30, score_percent: 90 }, { criterion_id: "uuid3", criterion_title: "Code Functionality", weight: 40, score_percent: 80 }], reviewer_notes: "Strong technical proficiency demonstrated." } } } }, responses: { 200: { description: "Scored. total_score computed automatically." } } } },
    "/admin/review/shortlists":                        { get: { tags: ["Admin – Review"], summary: "Shortlist queue", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlist jobs" } } } },
    "/admin/review/shortlists/{requestId}/candidates": { get: { tags: ["Admin – Review"], summary: "Scored candidates ranked by score — select top N", security: [{ bearerAuth: [] }], responses: { 200: { description: "Ranked candidates" } } } },
    "/admin/review/shortlists/{requestId}/confirm":    { post: { tags: ["Admin – Review"], summary: "Confirm top-N shortlist selection", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { selections: [{ candidate_id: "uuid", submission_id: "uuid", rank: 1 }, { candidate_id: "uuid2", submission_id: "uuid2", rank: 2 }] } } } }, responses: { 200: { description: "Shortlist confirmed" } } } },
    "/admin/review/shortlists/{requestId}/deliver":    { post: { tags: ["Admin – Review"], summary: "Deliver shortlist → employer notified, settlement created", security: [{ bearerAuth: [] }], responses: { 200: { description: "Delivered. final_charge and credit_returned calculated." } } } },

    // ── ADMIN WALLET ──────────────────────────────────────────────────────────
    "/admin/wallet": { get: { tags: ["Admin – Wallet"], summary: "Revenue overview + transaction history (?filter=oldest|latest|successful|failed)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Wallet summary" } } } },

    // ── ADMIN PROFILE ─────────────────────────────────────────────────────────
    "/admin/profile": { get: { tags: ["Admin – Profile"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } }, patch: { tags: ["Admin – Profile"], summary: "Update name, avatar, or password", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "Elvis", old_password: "Admin@Hack51!", new_password: "NewAdmin@51!" } } } }, responses: { 200: { description: "Profile updated" } } } },

    // ── ADMIN USERS ───────────────────────────────────────────────────────────
    "/admin/users": { get: { tags: ["Admin – Auth"], summary: "List all users (?role=candidate|employer|...)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Users" } } } },
    "/admin/users/{userId}/toggle-active": { patch: { tags: ["Admin – Auth"], summary: "Activate or deactivate a user account", security: [{ bearerAuth: [] }], responses: { 200: { description: "Status toggled" } } } },

    // ── EMPLOYER AUTH ─────────────────────────────────────────────────────────
    "/employer/auth/register": { post: { tags: ["Employer – Auth"], summary: "Register as employer", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!", role: "employer", first_name: "John" } } } }, responses: { 201: { description: "Account created, OTP sent" } } } },
    "/employer/auth/login":    { post: { tags: ["Employer – Auth"], summary: "Employer login (employer role only)", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + user" } } } },

    // ── EMPLOYER DASHBOARD ────────────────────────────────────────────────────
    "/employer/dashboard": { get: { tags: ["Employer – Dashboard"], summary: "Summary: total requests, submissions, shortlists", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },

    // ── EMPLOYER WORKSPACE ────────────────────────────────────────────────────
    "/employer/workspace": { get: { tags: ["Employer – Workspace"], summary: "Get workspace", security: [{ bearerAuth: [] }], responses: { 200: { description: "Workspace" } } }, patch: { tags: ["Employer – Workspace"], summary: "Update workspace", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { company_name: "Acme Corp", industry: "Technology", team_size: "11-50" } } } }, responses: { 200: { description: "Updated" } } } },

    // ── EMPLOYER REQUESTS ─────────────────────────────────────────────────────
    "/employer/requests":              { get: { tags: ["Employer – Requests"], summary: "List all requests (?drafts=true|?status=published)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests" } } }, post: { tags: ["Employer – Requests"], summary: "Create draft request", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { title: "Senior Product Designer", role_type: "Product Designer", role_level: "senior", challenge_id: "uuid", challenge_cap: 21, shortlist_size: 5, deadline: "2025-06-01T00:00:00Z" } } } }, responses: { 201: { description: "Draft created with deposit amount calculated" } } } },
    "/employer/requests/{id}":         { get: { tags: ["Employer – Requests"], summary: "Get request detail with billing and submission stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Request detail" } } }, patch: { tags: ["Employer – Requests"], summary: "Update draft request", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } }, delete: { tags: ["Employer – Requests"], summary: "Close request", security: [{ bearerAuth: [] }], responses: { 200: { description: "Closed" } } } },
    "/employer/requests/{id}/publish": { post: { tags: ["Employer – Requests"], summary: "Publish request (locks snapshot, initiates payment)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Published. payment.authorization_url returned for Paystack redirect." } } } },

    // ── EMPLOYER SHORTLISTS ───────────────────────────────────────────────────
    "/employer/shortlists":      { get: { tags: ["Employer – Shortlists"], summary: "All delivered shortlists with evidence packs", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlists" } } } },
    "/employer/shortlists/{id}": { get: { tags: ["Employer – Shortlists"], summary: "Single shortlist: Top N candidates with scores, artifacts, reviewer notes", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlist evidence pack" } } } },

    // ── EMPLOYER BILLING ──────────────────────────────────────────────────────
    "/employer/billing": { get: { tags: ["Employer – Billing"], summary: "Billing summary: deposits, charges, credits, transaction history", security: [{ bearerAuth: [] }], responses: { 200: { description: "Billing data" } } } },

    // ── EMPLOYER CATALOG (read-only) ──────────────────────────────────────────
    "/employer/catalog/roles":          { get: { tags: ["Employer – Requests"], summary: "Browse available roles (read-only)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Roles" } } } },
    "/employer/catalog/challenges":     { get: { tags: ["Employer – Requests"], summary: "Browse available challenges", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenges" } } } },
    "/employer/catalog/challenges/{id}":{ get: { tags: ["Employer – Requests"], summary: "Challenge detail with rubric preview", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge" } } } },

    // ── CANDIDATE AUTH ────────────────────────────────────────────────────────
    "/candidate/auth/register": { post: { tags: ["Candidate – Auth"], summary: "Register as candidate", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada" } } } }, responses: { 201: { description: "Account created, OTP sent" } } } },
    "/candidate/auth/login":    { post: { tags: ["Candidate – Auth"], summary: "Candidate login (candidate role only)", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + user" } } } },

    // ── CANDIDATE CHALLENGES (public) ─────────────────────────────────────────
    "/candidate/challenges":     { get: { tags: ["Candidate – Challenges"], summary: "Browse open challenges — no auth required (?search=keyword)", responses: { 200: { description: "Open challenges with company info" } } } },
    "/candidate/challenges/{id}":{ get: { tags: ["Candidate – Challenges"], summary: "Challenge detail with full rubric — no auth required", responses: { 200: { description: "Challenge detail" } } } },

    // ── CANDIDATE SUBMISSIONS ─────────────────────────────────────────────────
    "/candidate/challenges/{id}/submit": { post: { tags: ["Candidate – Submissions"], summary: "Submit to a challenge", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { artifact_urls: ["https://github.com/user/repo"], artifact_type: "link", submission_statement: "AI was used only for brainstorming.", integrity_declared: true } } } }, responses: { 201: { description: "Submission received" }, 409: { description: "Already submitted (resubmit only allowed when returned)" } } } },
    "/candidate/submissions":            { get: { tags: ["Candidate – Submissions"], summary: "My submissions with status and feedback", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submissions" } } } },
    "/candidate/submissions/{id}":       { get: { tags: ["Candidate – Submissions"], summary: "Single submission detail with triage/score", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission" } } } },

    // ── CANDIDATE PROFILE ─────────────────────────────────────────────────────
    "/candidate/profile": { get: { tags: ["Candidate – Profile"], summary: "Get candidate profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } }, patch: { tags: ["Candidate – Profile"], summary: "Update bio, skills, experience, links", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { bio: "Full-stack developer, 5 years experience", skills: ["TypeScript", "React"], experience_years: 5, location: "Lagos, NG", linkedin_url: "https://linkedin.com/in/ada" } } } }, responses: { 200: { description: "Updated" } } } },

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    "/payments/webhook": { post: { tags: ["Payments"], summary: "Paystack webhook (called by Paystack, not the frontend)", responses: { 200: { description: "Received" } } } },
  },
};

export function setupSwagger(app: Hono) {
  app.get("/openapi.json", (c) => c.json(openApiDoc));
  app.get("/docs", swaggerUI({ url: "/openapi.json" }));
}
