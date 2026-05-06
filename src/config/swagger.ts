import { Hono } from "hono";

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hack51 API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none !important; }
    .swagger-ui .info .title { color: #c41e3a; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: "/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: "BaseLayout",
        deepLinking: true,
        tryItOutEnabled: true,
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
      });
    };
  </script>
</body>
</html>`;

// ───────────────────────────────────────────────────────────────────────────
// Reusable examples
// ───────────────────────────────────────────────────────────────────────────

const ROLE_CREATE_EXAMPLE = {
  name: "Software Engineer",
  description: "Full-stack engineer",
  skill_levels: ["entry-level", "mid-level", "senior"],
  capabilities: [
    { title: "API Design",  summary: "Design RESTful APIs" },
    { title: "Data Modeling", summary: "Relational and document modeling" },
  ],
};

const ROLE_UPDATE_EXAMPLE = {
  name: "Senior Software Engineer",
  description: "Updated description",
  is_active: true,
  skill_levels: ["mid-level", "senior"],
  capabilities: [
    { id: "11111111-1111-1111-1111-111111111111", title: "API Design", summary: "Updated summary" },
    { title: "System Design", summary: "New capability added" },
  ],
};

const CHALLENGE_CREATE_EXAMPLE = {
  catalog_role_id: "11111111-1111-1111-1111-111111111111",
  title: "API Optimization Challenge",
  summary: "Improve a sluggish REST API",
  scenario: "Your team manages a backend API...",
  deliverables: ["Source code repo", "README.md", "Performance report"],
  submission_format: "Single ZIP or public GitHub link",
  constraints_text: "Max 10 pages.",
  submission_requirements: "Public GitHub repo with comprehensive README.",
  rubric_criteria: [
    { title: "Code Quality",       description: "Code patterns, readability",          weight: 30 },
    { title: "Code Technicality",  description: "Technical depth and architecture",     weight: 30 },
    { title: "Code Functionality", description: "Does it work correctly and efficiently", weight: 40 },
  ],
};

const CHALLENGE_UPDATE_EXAMPLE = {
  title: "Updated Challenge Title",
  is_active: true,
  rubric_criteria: [
    { id: "11111111-1111-1111-1111-111111111111", title: "Code Quality", description: "Updated", weight: 40 },
    { title: "New Criterion", description: "Newly added", weight: 60 },
  ],
};

const REQUEST_CREATE_EXAMPLE = {
  title: "Senior Product Designer",
  role_type: "Product Designer",
  role_level: "senior",
  challenge_id: "11111111-1111-1111-1111-111111111111",
  challenge_cap: 21,
  shortlist_size: 5,
  deadline: "2026-06-01T00:00:00Z",
  custom_rubric: [
    { title: "Visual Design",   description: "Aesthetics and polish",  weight: 30 },
    { title: "UX Reasoning",    description: "Logic and flow",         weight: 40 },
    { title: "Prototype Quality", description: "Technical execution", weight: 30 },
  ],
};

const PROPOSE_ROLE_EXAMPLE = {
  name: "Growth Marketing Lead",
  description: "Drives growth strategy and experimentation",
  skill_levels: ["mid-level", "senior"],
  capabilities: [
    { title: "Experiment Design", summary: "A/B testing, funnel analysis" },
    { title: "SEO Strategy", summary: "Technical and content SEO" },
  ],
};

const PROPOSE_CHALLENGE_EXAMPLE = {
  catalog_role_id: "11111111-1111-1111-1111-111111111111",
  title: "Growth Funnel Audit Challenge",
  summary: "Audit a sample funnel and propose improvements",
  scenario: "You've been hired as a consultant for...",
  deliverables: ["Audit report", "Prioritized recommendations", "Metrics dashboard mockup"],
  submission_format: "Google Docs link + Figma link",
  rubric_criteria: [
    { title: "Diagnostic Quality",   description: "Depth of funnel analysis", weight: 40 },
    { title: "Recommendation Rigor", description: "Actionable and prioritized", weight: 35 },
    { title: "Presentation",         description: "Clarity and visuals", weight: 25 },
  ],
};

const REVIEW_PROPOSAL_EXAMPLE = {
  decision: "approve", // or "reject"
  reason: "Optional — required for clarity on rejection",
};

// ───────────────────────────────────────────────────────────────────────────
// OpenAPI doc
// ───────────────────────────────────────────────────────────────────────────

const openApiDoc: any = {
  openapi: "3.1.0",
  info: {
    title: "Hack51 API",
    version: "1.2.2",
    description: `## Evidence-Based Hiring Platform API

### How to authenticate
1. Call **POST /auth/login** or a role-specific login endpoint
2. Copy the \`access_token\` from the response \`data\` field
3. Click **🔓 Authorize** (top right)
4. Paste ONLY the token — no "Bearer " prefix
5. Click **Authorize → Close**

### Default system admin
- **Email:** admin@hack51.com
- **Password:** Admin@Hack51!
- ⚠ Change immediately via \`PATCH /admin/profile\`

### Response format
Every response uses this envelope:
\`\`\`json
{ "status": "success|error", "message": "...", "data": {}, "error": null }
\`\`\``,
  },
  servers: [{ url: "/", description: "Current environment" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste ONLY the access_token (no 'Bearer ' prefix)",
      },
    },
    parameters: {
      // Reusable path parameters. Any endpoint with a {xxx} placeholder
      // in its URL needs a matching parameter declared, otherwise Swagger UI
      // does not render an input field — and "Try it out" sends the literal
      // "{xxx}" string to the server, which produces a 500 from Postgres.
      // The autoInjectPathParameters() pass at the bottom of this file walks
      // every path and adds the right parameter ref automatically.
      idPath:           { name: "id",           in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Resource UUID" },
      requestIdPath:    { name: "requestId",    in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Job request UUID" },
      userIdPath:       { name: "userId",       in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "User UUID" },
      submissionIdPath: { name: "submissionId", in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Submission UUID" },
      challengeIdPath:  { name: "challengeId",  in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Challenge UUID" },
      candidateIdPath:  { name: "candidateId",  in: "path", required: true, schema: { type: "string", format: "uuid" }, description: "Candidate UUID" },
      referencePath:    { name: "reference",    in: "path", required: true, schema: { type: "string" }, description: "Payment reference (e.g. H51-...)" },
      emailPath:        { name: "email",        in: "path", required: true, schema: { type: "string", format: "email" }, description: "User email address" },
    },
  },
  tags: [
    { name: "Auth",                     description: "Shared auth — register, verify, login, refresh, reset password" },
    { name: "Shared – Auth",            description: "Token refresh, logout, /me" },
    { name: "Admin – Auth",             description: "Admin login and account management" },
    { name: "Admin – Dashboard",        description: "Overview statistics and charts" },
    { name: "Admin – Catalog",          description: "Manage roles and challenges" },
    { name: "Admin – Proposals",        description: "Approve/reject employer-submitted catalog additions" },
    { name: "Admin – Review",           description: "Triage, scoring, shortlist delivery" },
    { name: "Admin – Wallet",           description: "Revenue and transaction overview" },
    { name: "Admin – Profile",          description: "Admin profile settings" },
    { name: "Admin – Notifications",    description: "Admin in-app notifications" },
    { name: "Employer – Auth",          description: "Employer registration and login" },
    { name: "Employer – Dashboard",     description: "Employer overview stats" },
    { name: "Employer – Catalog",       description: "Browse catalog + propose new roles/challenges" },
    { name: "Employer – Requests",      description: "Create and manage hiring requests" },
    { name: "Employer – Shortlists",    description: "View delivered shortlists" },
    { name: "Employer – Billing",       description: "Deposits, charges, and settlement" },
    { name: "Employer – Workspace",     description: "Company profile" },
    { name: "Employer – Notifications", description: "Employer in-app notifications" },
    { name: "Candidate – Auth",         description: "Candidate registration and login" },
    { name: "Candidate – Challenges",   description: "Browse open challenges (public)" },
    { name: "Candidate – Submissions",  description: "Submit and track submissions" },
    { name: "Candidate – Profile",      description: "Candidate profile" },
    { name: "Candidate – Dashboard",    description: "Candidate dashboard" },
    { name: "Candidate – Notifications",description: "Candidate in-app notifications" },
    { name: "Payments",                 description: "Paystack webhook" },
  ],
  paths: {
    "/health": { get: { tags: ["Auth"], summary: "Health check", responses: { 200: { description: "OK" } } } },

    // ── SHARED AUTH ─────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register (candidate or employer)",
        description: "Creates an unverified account and emails a 6-digit OTP. **DEV MODE:** when `DEV_MODE=true`, the response also includes `data.dev_otp` so you can test without depending on email delivery.",
        requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } },
        responses: { 201: { description: "Account created. Response: { user, dev_otp?, dev_note? }" }, 409: { description: "Email already exists" }, 422: { description: "Validation error" } },
      },
    },
    "/auth/verify-email":     { post: { tags: ["Auth"], summary: "Verify email with 6-digit OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "482913" } } } }, responses: { 200: { description: "Email verified" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/resend-otp":       { post: { tags: ["Auth"], summary: "Resend verification OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "OTP resent (includes dev_otp in dev mode)" } } } },
    "/auth/login":            { post: { tags: ["Auth"], summary: "Login (any role)", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + user" }, 401: { description: "Invalid credentials" }, 403: { description: "Email not verified or account inactive" } } } },
    "/auth/refresh":          { post: { tags: ["Shared – Auth"], summary: "Rotate refresh token", requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "New token pair" }, 401: { description: "Invalid or reused token" } } } },
    "/auth/logout":           { post: { tags: ["Shared – Auth"], summary: "Logout — revoke refresh token", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "Logged out" } } } },
    "/auth/forgot-password":  { post: { tags: ["Auth"], summary: "Request password reset", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "Reset OTP sent (includes dev_otp in dev mode)" } } } },
    "/auth/verify-reset-otp": { post: { tags: ["Auth"], summary: "Verify reset OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "391045" } } } }, responses: { 200: { description: "reset_token returned" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/reset-password":   { post: { tags: ["Auth"], summary: "Set new password using reset_token", requestBody: { required: true, content: { "application/json": { example: { reset_token: "eyJ...", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Password changed" } } } },
    "/auth/me":               { get: { tags: ["Shared – Auth"], summary: "Get current user", security: [{ bearerAuth: [] }], responses: { 200: { description: "User profile" }, 401: { description: "Invalid or expired token" } } } },

    // ── ADMIN AUTH ──────────────────────────────────────────────────────────
    "/admin/auth/login":  { post: { tags: ["Admin – Auth"], summary: "Admin login", requestBody: { required: true, content: { "application/json": { example: { email: "admin@hack51.com", password: "Admin@Hack51!" } } } }, responses: { 200: { description: "Tokens + admin user" }, 403: { description: "Not an admin role" } } } },
    "/admin/auth/me":     { get:  { tags: ["Admin – Auth"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Admin profile" } } } },
    "/admin/auth/create": { post: { tags: ["Admin – Auth"], summary: "Create admin account (system_admin only)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { email: "reviewer@hack51.com", password: "SecurePass1!", role: "admin_reviewer", first_name: "Jane" } } } }, responses: { 201: { description: "Admin created" }, 403: { description: "Only system_admin can create admin accounts" } } } },

    // DEV ONLY
    "/admin/dev/otp-info/{email}": {
      get: {
        tags: ["Admin – Auth"],
        summary: "DEV ONLY: Look up a user's verification status & recent OTP activity",
        description: "Returns 403 DEV_MODE_DISABLED in production. Useful when emails are not reaching the inbox. To get the actual OTP code, call POST /auth/resend-otp — when DEV_MODE is on, the code is in the response.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User info + recent OTPs" }, 403: { description: "DEV_MODE_DISABLED" }, 404: { description: "USER_NOT_FOUND" } },
      },
    },

    // ── ADMIN PROFILE & DASHBOARD ───────────────────────────────────────────
    "/admin/profile":   { get: { tags: ["Admin – Profile"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } }, patch: { tags: ["Admin – Profile"], summary: "Update name, avatar, or password", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "Elvis", old_password: "Admin@Hack51!", new_password: "NewAdmin@51!" } } } }, responses: { 200: { description: "Updated" } } } },
    "/admin/dashboard": { get: { tags: ["Admin – Dashboard"], summary: "Admin overview statistics", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },

    // ── ADMIN USERS ─────────────────────────────────────────────────────────
    "/admin/users":                        { get:   { tags: ["Admin – Auth"], summary: "List users — ?role=&search=", security: [{ bearerAuth: [] }], responses: { 200: { description: "Users" } } } },
    "/admin/users/{userId}/toggle-active": { patch: { tags: ["Admin – Auth"], summary: "Activate / deactivate a user", security: [{ bearerAuth: [] }], responses: { 200: { description: "Status toggled" } } } },

    // ── ADMIN CATALOG: ROLES ────────────────────────────────────────────────
    "/admin/catalog/roles": {
      get:  { tags: ["Admin – Catalog"], summary: "List roles — ?active=false | ?status=pending|rejected", security: [{ bearerAuth: [] }], responses: { 200: { description: "Roles with skill_levels, capabilities, and linked challenges" } } },
      post: { tags: ["Admin – Catalog"], summary: "Create role (admin_lead+)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: ROLE_CREATE_EXAMPLE } } }, responses: { 201: { description: "Role created" } } },
    },
    "/admin/catalog/roles/{id}": {
      get:    { tags: ["Admin – Catalog"], summary: "Get role detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Role with full detail" } } },
      put:    { tags: ["Admin – Catalog"], summary: "Update role — name, description, is_active, skill_levels, capabilities", description: "Pass an empty array to clear a collection. Capabilities with an id are updated; those without are inserted; existing capabilities whose id is not in the payload are deleted.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: ROLE_UPDATE_EXAMPLE } } }, responses: { 200: { description: "Updated role with full detail" } } },
      delete: { tags: ["Admin – Catalog"], summary: "Delete role — cascades to challenges", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } },
    },

    // ── ADMIN CATALOG: CHALLENGES ───────────────────────────────────────────
    "/admin/catalog/challenges": {
      get:  { tags: ["Admin – Catalog"], summary: "List challenges — ?active=false | ?status=pending|rejected", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenges with rubric" } } },
      post: { tags: ["Admin – Catalog"], summary: "Create challenge — rubric weights must sum to 100", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: CHALLENGE_CREATE_EXAMPLE } } }, responses: { 201: { description: "Challenge created" }, 422: { description: "Rubric weights do not sum to 100" } } },
    },
    "/admin/catalog/challenges/{id}": {
      get:    { tags: ["Admin – Catalog"], summary: "Get challenge detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge with full rubric" } } },
      put:    { tags: ["Admin – Catalog"], summary: "Update challenge and/or rubric criteria", description: "Omit rubric_criteria to leave rubric unchanged. Pass an array to replace the entire rubric (weights must sum to 100). Pass [] to clear.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: CHALLENGE_UPDATE_EXAMPLE } } }, responses: { 200: { description: "Updated" }, 422: { description: "Rubric weights do not sum to 100" } } },
      delete: { tags: ["Admin – Catalog"], summary: "Delete challenge", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } },
    },

    // ── ADMIN PROPOSAL REVIEW ───────────────────────────────────────────────
    "/admin/catalog/proposals/roles":                 { get:  { tags: ["Admin – Proposals"], summary: "List pending role proposals from employers", security: [{ bearerAuth: [] }], responses: { 200: { description: "Pending role proposals" } } } },
    "/admin/catalog/proposals/roles/{id}/review":     { post: { tags: ["Admin – Proposals"], summary: "Approve or reject a role proposal", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REVIEW_PROPOSAL_EXAMPLE } } }, responses: { 200: { description: "Proposal reviewed" } } } },
    "/admin/catalog/proposals/challenges":            { get:  { tags: ["Admin – Proposals"], summary: "List pending challenge proposals", security: [{ bearerAuth: [] }], responses: { 200: { description: "Pending challenge proposals" } } } },
    "/admin/catalog/proposals/challenges/{id}/review":{ post: { tags: ["Admin – Proposals"], summary: "Approve or reject a challenge proposal", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REVIEW_PROPOSAL_EXAMPLE } } }, responses: { 200: { description: "Proposal reviewed" } } } },

    // ── ADMIN REVIEW ────────────────────────────────────────────────────────
    "/admin/review/requests":                              { get:  { tags: ["Admin – Review"], summary: "Active request queue — ?status=published|evaluating|shortlisted", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests with employer and company info" } } } },
    "/admin/review/requests/{requestId}/submissions":      { get:  { tags: ["Admin – Review"], summary: "All submissions for a request with status stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Stats + submissions list" } } } },
    "/admin/review/submissions/{id}":                      { get:  { tags: ["Admin – Review"], summary: "Full submission detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission detail" } } } },
    "/admin/review/submissions/{id}/triage":               { post: { tags: ["Admin – Review"], summary: "Triage submission", description: "Mark a submission as valid (→ under_review), invalid (→ rejected) or returned (→ candidate can resubmit). The candidate is notified after every triage decision.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { decision: "valid", reason: "All deliverables present" } } } }, responses: { 200: { description: "Triaged" }, 404: { description: "SUBMISSION_NOT_FOUND" } } } },
    "/admin/review/submissions/{id}/score":                { post: { tags: ["Admin – Review"], summary: "Score submission — total_score auto-calculated as weighted sum", description: "Replace the `criterion_id` values with real UUIDs from the request's `snapshot_rubric` (which you get from `GET /admin/review/submissions/{id}` → `data.job_requests.snapshot_rubric[*].id`). The example UUIDs below are illustrative.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { scores: [{ criterion_id: "f19eb0b4-8d94-4d9b-9e27-958492985d70", criterion_title: "Code Quality", weight: 30, score_percent: 85 }, { criterion_id: "15cf1549-ca33-4faa-b9ce-440c2fe29d2c", criterion_title: "Code Technicality", weight: 30, score_percent: 90 }, { criterion_id: "5453462c-e081-42b6-997d-b42b90fe428b", criterion_title: "Code Functionality", weight: 40, score_percent: 80 }], reviewer_notes: "Strong technical proficiency." } } } }, responses: { 200: { description: "Scored" }, 404: { description: "SUBMISSION_NOT_FOUND" }, 422: { description: "VALIDATION_ERROR — criterion_id must be a real UUID" } } } },

    "/admin/review/shortlists":                            { get:  { tags: ["Admin – Review"], summary: "Shortlist queue", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlist jobs" } } } },
    "/admin/review/shortlists/{requestId}/candidates":     { get:  { tags: ["Admin – Review"], summary: "Scored candidates ranked by total_score", security: [{ bearerAuth: [] }], responses: { 200: { description: "Ranked candidates" } } } },
    "/admin/review/shortlists/{requestId}/confirm":        { post: { tags: ["Admin – Review"], summary: "Confirm top-N shortlist (admin_lead+)", description: "Replace the `candidate_id` and `submission_id` values with real UUIDs from `GET /admin/review/shortlists/{requestId}/candidates`. The example UUIDs below are illustrative. Calling this endpoint with a non-empty selection moves those submissions to `shortlisted` status. Last call wins (idempotent) — you can re-confirm a different selection until you call `/deliver`.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { selections: [{ candidate_id: "11111111-1111-1111-1111-111111111111", submission_id: "22222222-2222-2222-2222-222222222222", rank: 1 }, { candidate_id: "33333333-3333-3333-3333-333333333333", submission_id: "44444444-4444-4444-4444-444444444444", rank: 2 }, { candidate_id: "55555555-5555-5555-5555-555555555555", submission_id: "66666666-6666-6666-6666-666666666666", rank: 3 }] } } } }, responses: { 200: { description: "Shortlist confirmed" }, 400: { description: "EMPTY_SHORTLIST — selections array cannot be empty" }, 422: { description: "VALIDATION_ERROR — candidate_id / submission_id must be real UUIDs" } } } },
    "/admin/review/shortlists/{requestId}/deliver":        { post: { tags: ["Admin – Review"], summary: "Deliver shortlist — settlement record created, employer notified", description: "One-shot. Requires that you have already called `/confirm` with a non-empty selection. The deliver pass stamps `delivered_at` on every shortlist row, moves the request to `shortlisted`, creates the settlement record (final_charge = admin_fee + delivered_count × unit_price, with the remainder returned to the employer as credit), and sends the employer an in-app notification.", security: [{ bearerAuth: [] }], responses: { 200: { description: "Delivered with final_charge and credit_returned" }, 400: { description: "NO_CONFIRMED_SHORTLIST — call `/confirm` first | ALREADY_DELIVERED — request is already in `shortlisted` status" }, 404: { description: "REQUEST_NOT_FOUND" } } } },

    // ── ADMIN WALLET + NOTIFICATIONS ────────────────────────────────────────
    "/admin/wallet":                  { get: { tags: ["Admin – Wallet"], summary: "Revenue overview + transactions — ?filter=oldest|latest|successful|failed", security: [{ bearerAuth: [] }], responses: { 200: { description: "Wallet data" } } } },
    "/admin/notifications":           { get:  { tags: ["Admin – Notifications"], summary: "Admin notifications — ?unread=true", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/admin/notifications/mark-read": { post: { tags: ["Admin – Notifications"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── EMPLOYER AUTH + PROFILE + DASHBOARD + WORKSPACE ─────────────────────
    "/employer/auth/register": { post: { tags: ["Employer – Auth"], summary: "Register as employer", description: "Same as /auth/register but role-locked to employer. **DEV MODE:** response includes `data.dev_otp`.", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!", role: "employer", first_name: "John", last_name: "Doe" } } } }, responses: { 201: { description: "Account created" } } } },
    "/employer/auth/login":    { post: { tags: ["Employer – Auth"], summary: "Employer login", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + employer user" } } } },
    "/employer/profile":       { get: { tags: ["Employer – Workspace"], summary: "Get employer profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } }, patch: { tags: ["Employer – Workspace"], summary: "Update name/avatar/password", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "John", old_password: "SecurePass1!", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Updated" } } } },
    "/employer/dashboard":     { get: { tags: ["Employer – Dashboard"], summary: "Employer overview stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },
    "/employer/workspace":     { get: { tags: ["Employer – Workspace"], summary: "Get workspace", security: [{ bearerAuth: [] }], responses: { 200: { description: "Workspace" } } }, patch: { tags: ["Employer – Workspace"], summary: "Update workspace", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { company_name: "Acme Corp", company_url: "https://acme.com", industry: "Technology", team_size: "11-50" } } } }, responses: { 200: { description: "Updated" } } } },

    // ── EMPLOYER CATALOG (browse + propose) ─────────────────────────────────
    "/employer/catalog/roles":          { get: { tags: ["Employer – Catalog"], summary: "Browse available roles + your own proposals", security: [{ bearerAuth: [] }], responses: { 200: { description: "{ approved: [...], my_proposals: [...] }" } } } },
    "/employer/catalog/challenges":     { get: { tags: ["Employer – Catalog"], summary: "Browse available challenges — ?role_id=uuid filters by role", security: [{ bearerAuth: [] }], responses: { 200: { description: "{ approved: [...], my_proposals: [...] }" } } } },
    "/employer/catalog/challenges/{id}":{ get: { tags: ["Employer – Catalog"], summary: "Challenge detail with full rubric", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge + rubric" } } } },
    "/employer/catalog/propose/role":   { post: { tags: ["Employer – Catalog"], summary: "Propose a new role for admin review", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: PROPOSE_ROLE_EXAMPLE } } }, responses: { 201: { description: "Role proposal submitted" } } } },
    "/employer/catalog/propose/challenge": { post: { tags: ["Employer – Catalog"], summary: "Propose a new challenge for admin review — rubric weights must sum to 100", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: PROPOSE_CHALLENGE_EXAMPLE } } }, responses: { 201: { description: "Challenge proposal submitted" }, 422: { description: "Rubric weights do not sum to 100" } } } },

    // ── EMPLOYER REQUESTS ───────────────────────────────────────────────────
    "/employer/requests": {
      get:  { tags: ["Employer – Requests"], summary: "List requests — ?drafts=true | ?status=...", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests" } } },
      post: { tags: ["Employer – Requests"], summary: "Create draft request — deposit auto-calculated", description: "Set `custom_rubric` to override the challenge's default rubric for this request only. Weights must sum to 100.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REQUEST_CREATE_EXAMPLE } } }, responses: { 201: { description: "Draft created" } } },
    },
    "/employer/requests/{id}": {
      get:    { tags: ["Employer – Requests"], summary: "Request detail with submission stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Request + submission_stats" } } },
      patch:  { tags: ["Employer – Requests"], summary: "Update draft — any field including custom_rubric", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Employer – Requests"], summary: "Close request", security: [{ bearerAuth: [] }], responses: { 200: { description: "Closed" } } },
    },
    "/employer/requests/{id}/publish": {
      post: {
        tags: ["Employer – Requests"],
        summary: "Publish request — locks rubric snapshot, initiates payment",
        description: "Behaviour depends on SKIP_PAYMENT env flag. When true (default in non-production), request goes to `published` and payment is auto-marked success. Response includes `payment.skip: true` so frontend skips the redirect. When false (production), Paystack is called and `payment.authorization_url` must be redirected to.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Published. Response: { request, payment: { authorization_url, skip, status } }" }, 400: { description: "NOT_DRAFT or NO_CHALLENGE or RUBRIC_WEIGHT_INVALID" } },
      },
    },
    "/employer/requests/{id}/submissions": {
      get: {
        tags: ["Employer – Requests"],
        summary: "List submissions for one of your requests",
        description: "Returns every candidate who has submitted, with status, submitted_at, and total_score (if scored). Artifact URLs are NOT exposed until the shortlist is delivered — use /employer/shortlists/:id for full evidence pack.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Array of submissions" }, 404: { description: "REQUEST_NOT_FOUND" } },
      },
    },
    "/employer/requests/{id}/rerun": {
      post: {
        tags: ["Employer – Requests"],
        summary: "Duplicate a previous request as a new draft",
        description: "Creates a new draft preserving title (with ' (rerun)' suffix), challenge, role_type, role_level, cap, shortlist_size, and custom_rubric. Deadline is NOT carried over.",
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: "New draft request created" }, 404: { description: "REQUEST_NOT_FOUND" } },
      },
    },

    // ── EMPLOYER SHORTLISTS ─────────────────────────────────────────────────
    "/employer/shortlists":                  { get: { tags: ["Employer – Shortlists"], summary: "All delivered shortlists", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlists" } } } },
    "/employer/shortlists/{id}":             { get: { tags: ["Employer – Shortlists"], summary: "Single shortlist with evidence pack (top-N)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Evidence pack" } } } },
    "/employer/shortlists/{id}/unlock": {
      post: {
        tags: ["Employer – Shortlists"],
        summary: "Pay to unlock the full talent list",
        description: "Initiates a payment to access EVERY scored candidate. Cost defaults to ₦240,000 (FULL_LIST_UNLOCK_NGN env). Same skip-payment behaviour as /publish.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Payment initiated. Response includes `payment.skip` flag." }, 400: { description: "SHORTLIST_NOT_DELIVERED" } },
      },
    },
    "/employer/shortlists/{id}/full-list": {
      get: {
        tags: ["Employer – Shortlists"],
        summary: "Get every scored candidate — requires unlock payment",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Full ranked list" }, 400: { description: "FULL_LIST_LOCKED" } },
      },
    },
    "/employer/shortlists/{id}/export.csv": {
      get: {
        tags: ["Employer – Shortlists"],
        summary: "Download the shortlist as CSV",
        description: "Returns text/csv (NOT the JSON envelope) with Content-Disposition attachment.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "CSV file download" } },
      },
    },

    // ── EMPLOYER BILLING + PAYMENTS ─────────────────────────────────────────
    "/employer/billing":      { get: { tags: ["Employer – Billing"], summary: "Billing history (all requests)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Billing data" } } } },
    "/employer/billing/{id}": {
      get: {
        tags: ["Employer – Billing"],
        summary: "Billing breakdown for one request",
        description: "Returns line items (admin_setup_fee, prepaid_deposit, final_charge, credit_returned, full_list_unlock) plus full transaction history.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Per-request billing breakdown" } },
      },
    },
    "/employer/payments/initiate":            { post: { tags: ["Employer – Billing"], summary: "Initiate Paystack payment", description: "Replace `job_request_id` with the real UUID of the request you're paying for. The example UUID below is illustrative.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { amount_ngn: 4580000, job_request_id: "11111111-1111-1111-1111-111111111111", payment_type: "deposit" } } } }, responses: { 200: { description: "authorization_url returned" } } } },
    "/employer/payments/verify/{reference}":  { get:  { tags: ["Employer – Billing"], summary: "Verify a payment by reference", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payment status" } } } },
    "/employer/payments/history":             { get:  { tags: ["Employer – Billing"], summary: "All payments by this employer", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payments" } } } },

    "/employer/notifications":                { get:  { tags: ["Employer – Notifications"], summary: "Notifications — ?unread=true", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications" } } } },
    "/employer/notifications/mark-read":      { post: { tags: ["Employer – Notifications"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── CANDIDATE ───────────────────────────────────────────────────────────
    "/candidate/auth/register": { post: { tags: ["Candidate – Auth"], summary: "Register as candidate", description: "Same as /auth/register but role-locked. **DEV MODE:** response includes `data.dev_otp`.", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } }, responses: { 201: { description: "Account created" } } } },
    "/candidate/auth/login":    { post: { tags: ["Candidate – Auth"], summary: "Candidate login", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + candidate user" } } } },
    "/candidate/challenges":      { get: { tags: ["Candidate – Challenges"], summary: "Browse open challenges — NO AUTH. ?search=keyword", responses: { 200: { description: "Published requests" } } } },
    "/candidate/challenges/{id}": { get: { tags: ["Candidate – Challenges"], summary: "Challenge detail — NO AUTH", responses: { 200: { description: "Full challenge detail" } } } },
    "/candidate/challenges/{id}/submit": { post: { tags: ["Candidate – Submissions"], summary: "Submit to challenge", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { artifact_urls: ["https://github.com/user/repo"], artifact_type: "link", submission_statement: "All my own work.", integrity_declared: true } } } }, responses: { 201: { description: "Submission received" }, 409: { description: "Already submitted" }, 403: { description: "Challenge closed or deadline passed" } } } },
    "/candidate/submissions":     { get: { tags: ["Candidate – Submissions"], summary: "My submissions", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submissions" } } } },
    "/candidate/submissions/{id}":{ get: { tags: ["Candidate – Submissions"], summary: "Single submission detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission" } } } },
    "/candidate/profile": {
      get:   { tags: ["Candidate – Profile"], summary: "Get candidate profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } },
      patch: { tags: ["Candidate – Profile"], summary: "Update candidate profile", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { bio: "Full-stack dev, 5 years", skills: ["TypeScript", "React"], experience_years: 5, location: "Lagos, Nigeria" } } } }, responses: { 200: { description: "Updated" } } },
    },
    "/candidate/settings":             { patch: { tags: ["Candidate – Profile"], summary: "Update account settings (name, avatar, password)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "Ada", old_password: "SecurePass1!", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Updated" } } } },
    "/candidate/dashboard":            { get: { tags: ["Candidate – Dashboard"], summary: "Candidate dashboard", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },
    "/candidate/notifications":        { get:  { tags: ["Candidate – Notifications"], summary: "Notifications — ?unread=true", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications" } } } },
    "/candidate/notifications/mark-read":{ post:{ tags: ["Candidate – Notifications"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── PAYMENTS WEBHOOK ────────────────────────────────────────────────────
    "/payments/webhook": { post: { tags: ["Payments"], summary: "Paystack webhook — Paystack-only, auth via x-paystack-signature", parameters: [{ in: "header", name: "x-paystack-signature", required: true, schema: { type: "string" }, description: "HMAC-SHA512 signature of the raw body" }], responses: { 200: { description: "Received" } } } },
  },
};

/**
 * Auto-inject `parameters` for any path that contains `{xxx}` placeholders.
 *
 * Without this, Swagger UI does not render an input box for path parameters
 * and "Try it out" sends the literal "{requestId}" string to the server,
 * which causes Postgres errors. Rather than remember to manually add
 * `parameters` to every endpoint definition, we walk the paths object once
 * at startup and inject the right parameter ref(s) based on the placeholders
 * in the URL.
 */
function autoInjectPathParameters(spec: typeof openApiDoc): void {
  // Map placeholder name → component parameter ref name
  const PLACEHOLDER_TO_PARAM: Record<string, string> = {
    id: "idPath",
    requestId: "requestIdPath",
    userId: "userIdPath",
    submissionId: "submissionIdPath",
    challengeId: "challengeIdPath",
    candidateId: "candidateIdPath",
    reference: "referencePath",
    email: "emailPath",
  };

  for (const [path, pathItem] of Object.entries(spec.paths) as [string, any][]) {
    // Find every {xxx} placeholder in the URL
    const placeholders = [...path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (placeholders.length === 0) continue;

    // Build the params array for this path
    const pathParams = placeholders
      .map((name) => PLACEHOLDER_TO_PARAM[name])
      .filter(Boolean)
      .map((refName) => ({ $ref: `#/components/parameters/${refName}` }));

    if (pathParams.length === 0) continue;

    // Apply to every method on this path (get, post, put, patch, delete)
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const op = pathItem[method];
      if (!op) continue;
      const existing = Array.isArray(op.parameters) ? op.parameters : [];
      // Don't duplicate — only add path params not already declared
      const existingNames = new Set(
        existing
          .map((p: any) => (p.$ref ? p.$ref.split("/").pop() : p.name))
          .filter(Boolean),
      );
      const toAdd = pathParams.filter(
        (p) => !existingNames.has(p.$ref.split("/").pop()),
      );
      op.parameters = [...existing, ...toAdd];
    }
  }
}

// Run the injection pass once at module load.
autoInjectPathParameters(openApiDoc);

export function setupSwagger(app: Hono) {
  app.get("/openapi.json", (c) => c.json(openApiDoc));
  app.get("/docs", (c) => c.html(SWAGGER_HTML));
}
