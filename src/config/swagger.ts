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
// Reusable examples (keeps the paths block readable)
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
    { id: "existing-capability-uuid", title: "API Design", summary: "Updated summary" },
    { title: "System Design", summary: "New capability added" },
  ],
};

const CHALLENGE_CREATE_EXAMPLE = {
  catalog_role_id: "uuid-here",
  title: "API Optimization Challenge",
  summary: "Improve a sluggish REST API",
  scenario: "Your team manages a backend API...",
  deliverables: ["Source code repo", "README.md", "Performance report"],
  submission_format: "Single ZIP or public GitHub link",
  constraints_text: "Max 10 pages. No external libraries not in requirements.",
  submission_requirements: "Provide a public GitHub repo with a comprehensive README.",
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
    { id: "existing-criterion-uuid", title: "Code Quality", description: "Updated", weight: 40 },
    { title: "New Criterion", description: "Newly added", weight: 60 },
  ],
};

const REQUEST_CREATE_EXAMPLE = {
  title: "Senior Product Designer",
  role_type: "Product Designer",
  role_level: "senior",
  challenge_id: "uuid-from-catalog",
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
  catalog_role_id: "uuid-of-existing-or-proposed-role",
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

const openApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Hack51 API",
    version: "1.1.0",
    description: `## Evidence-Based Hiring Platform API

### How to authenticate
1. Call **POST /auth/login** or a role-specific login endpoint
2. Copy the \`access_token\` from the response \`data\` field
3. Click **🔓 Authorize** (top right)
4. Paste ONLY the token — no "Bearer " prefix, not the password hash
5. Click **Authorize → Close**

### Default system admin
- **Email:** admin@hack51.com
- **Password:** Admin@Hack51!
- ⚠ Change immediately via \`PATCH /admin/profile\`

### Response format
\`\`\`json
{ "status": "success|error", "message": "...", "data": {}, "error": null }
\`\`\`

### What's new in v1.1
- \`PUT /admin/catalog/roles/{id}\` now accepts \`skill_levels\` and \`capabilities\`
- New employer endpoints: propose custom roles and challenges
- New admin endpoints: review employer-submitted proposals
- New \`custom_rubric\` field on job requests — override the challenge rubric per request`,
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
    { name: "Employer – Shortlists",    description: "View delivered shortlists with evidence packs" },
    { name: "Employer – Billing",       description: "Deposits, charges, and settlement" },
    { name: "Employer – Workspace",     description: "Company profile" },
    { name: "Employer – Notifications", description: "Employer in-app notifications" },
    { name: "Candidate – Auth",         description: "Candidate registration and login" },
    { name: "Candidate – Challenges",   description: "Browse open challenges (public, no auth needed)" },
    { name: "Candidate – Submissions",  description: "Submit and track submissions" },
    { name: "Candidate – Profile",      description: "Candidate profile" },
    { name: "Candidate – Dashboard",    description: "Candidate dashboard" },
    { name: "Candidate – Notifications",description: "Candidate in-app notifications" },
    { name: "Payments",                 description: "Paystack webhook (called by Paystack)" },
  ],
  paths: {
    "/health": { get: { tags: ["Auth"], summary: "Health check", responses: { 200: { description: "OK" } } } },

    // ── SHARED AUTH ─────────────────────────────────────────────────────────
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register (candidate or employer)",
        description: "Creates an unverified account and emails a 6-digit OTP. **DEV MODE:** when `DEV_MODE=true` (default in non-production), the response also includes `data.dev_otp` so you can test without depending on email delivery. The frontend dev should look for this field and use it directly with /auth/verify-email when emails aren't reaching the inbox (e.g. Resend free-tier sandbox).",
        requestBody: {
          required: true,
          content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } },
        },
        responses: {
          201: { description: "Account created. Response: { user, dev_otp?, dev_note? } — dev_otp only present when DEV_MODE is on." },
          409: { description: "Email already exists" },
          422: { description: "Validation error" },
        },
      },
    },
    "/auth/verify-email":     { post: { tags: ["Auth"], summary: "Verify email with 6-digit OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "482913" } } } }, responses: { 200: { description: "Email verified, welcome email sent" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/resend-otp":       { post: { tags: ["Auth"], summary: "Resend verification OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "OTP resent" } } } },
    "/auth/login":            { post: { tags: ["Auth"], summary: "Login (any role)", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + user" }, 401: { description: "Invalid credentials" }, 403: { description: "Email not verified or account inactive" } } } },
    "/auth/refresh":          { post: { tags: ["Shared – Auth"], summary: "Rotate refresh token", requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "New token pair" }, 401: { description: "Invalid or reused token" } } } },
    "/auth/logout":           { post: { tags: ["Shared – Auth"], summary: "Logout — revoke refresh token", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "Logged out" } } } },
    "/auth/forgot-password":  { post: { tags: ["Auth"], summary: "Request password reset", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "Reset OTP sent" } } } },
    "/auth/verify-reset-otp": { post: { tags: ["Auth"], summary: "Verify reset OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "391045" } } } }, responses: { 200: { description: "reset_token returned" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/reset-password":   { post: { tags: ["Auth"], summary: "Set new password using reset_token", requestBody: { required: true, content: { "application/json": { example: { reset_token: "eyJ...", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Password changed" } } } },
    "/auth/me":               { get: { tags: ["Shared – Auth"], summary: "Get current user", security: [{ bearerAuth: [] }], responses: { 200: { description: "User profile" }, 401: { description: "Invalid or expired token" } } } },

    // ── ADMIN AUTH ──────────────────────────────────────────────────────────
    "/admin/auth/login":  { post: { tags: ["Admin – Auth"], summary: "Admin login", requestBody: { required: true, content: { "application/json": { example: { email: "admin@hack51.com", password: "Admin@Hack51!" } } } }, responses: { 200: { description: "Tokens + admin user" }, 403: { description: "Not an admin role" } } } },
    "/admin/auth/me":     { get:  { tags: ["Admin – Auth"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Admin profile" } } } },
    "/admin/auth/create": { post: { tags: ["Admin – Auth"], summary: "Create admin account (system_admin only)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { email: "reviewer@hack51.com", password: "SecurePass1!", role: "admin_reviewer", first_name: "Jane" } } } }, responses: { 201: { description: "Admin created, OTP emailed" }, 403: { description: "Only system_admin can create admin accounts" } } } },

    // NEW: Dev-only OTP inspection — auto-disabled in production
    "/admin/dev/otp-info/{email}": {
      get: {
        tags: ["Admin – Auth"],
        summary: "DEV ONLY: Look up a user's verification status & recent OTP activity",
        description: "Returns 403 DEV_MODE_DISABLED in production. Useful when emails are not reaching the inbox (e.g. Resend free-tier limit). To get the actual OTP code, call POST /auth/resend-otp — when DEV_MODE is on, the code is in the response. This endpoint is admin-protected and shows the user's verification status plus the last 5 OTPs (purpose, expires_at, used_at) without exposing the plaintext codes (storage is hashed).",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User info + recent OTPs + instructions" },
          403: { description: "DEV_MODE_DISABLED — only enabled when DEV_MODE=true and NODE_ENV != production" },
          404: { description: "USER_NOT_FOUND" },
        },
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
      get:    { tags: ["Admin – Catalog"], summary: "Get role detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Role with skill_levels, capabilities, challenges + rubric" } } },
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

    // ── ADMIN PROPOSAL REVIEW (NEW) ─────────────────────────────────────────
    "/admin/catalog/proposals/roles":                 { get:  { tags: ["Admin – Proposals"], summary: "List pending role proposals from employers", security: [{ bearerAuth: [] }], responses: { 200: { description: "Pending role proposals with proposer details" } } } },
    "/admin/catalog/proposals/roles/{id}/review":     { post: { tags: ["Admin – Proposals"], summary: "Approve or reject a role proposal", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REVIEW_PROPOSAL_EXAMPLE } } }, responses: { 200: { description: "Proposal reviewed — employer notified" } } } },
    "/admin/catalog/proposals/challenges":            { get:  { tags: ["Admin – Proposals"], summary: "List pending challenge proposals from employers", security: [{ bearerAuth: [] }], responses: { 200: { description: "Pending challenge proposals" } } } },
    "/admin/catalog/proposals/challenges/{id}/review":{ post: { tags: ["Admin – Proposals"], summary: "Approve or reject a challenge proposal", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REVIEW_PROPOSAL_EXAMPLE } } }, responses: { 200: { description: "Proposal reviewed — employer notified" } } } },

    // ── ADMIN REVIEW: QUEUE + SCORING ───────────────────────────────────────
    "/admin/review/requests":                              { get:  { tags: ["Admin – Review"], summary: "Active request queue — ?status=published|evaluating|shortlisted", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests with employer and company info" } } } },
    "/admin/review/requests/{requestId}/submissions":      { get:  { tags: ["Admin – Review"], summary: "All submissions for a request with status stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Stats + submissions list" } } } },
    "/admin/review/submissions/{id}":                      { get:  { tags: ["Admin – Review"], summary: "Full submission detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission detail" } } } },
    "/admin/review/submissions/{id}/triage":               { post: { tags: ["Admin – Review"], summary: "Triage submission", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { decision: "valid", reason: "All deliverables present" } } } }, responses: { 200: { description: "Triaged" } } } },
    "/admin/review/submissions/{id}/score":                { post: { tags: ["Admin – Review"], summary: "Score submission — total_score auto-calculated as weighted sum", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { scores: [{ criterion_id: "uuid", criterion_title: "Code Quality", weight: 30, score_percent: 85 }, { criterion_id: "uuid2", criterion_title: "Code Technicality", weight: 30, score_percent: 90 }, { criterion_id: "uuid3", criterion_title: "Code Functionality", weight: 40, score_percent: 80 }], reviewer_notes: "Strong technical proficiency." } } } }, responses: { 200: { description: "Scored" } } } },

    // ── ADMIN REVIEW: SHORTLISTS ────────────────────────────────────────────
    "/admin/review/shortlists":                            { get:  { tags: ["Admin – Review"], summary: "Shortlist queue", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlist jobs" } } } },
    "/admin/review/shortlists/{requestId}/candidates":     { get:  { tags: ["Admin – Review"], summary: "Scored candidates ranked by total_score", security: [{ bearerAuth: [] }], responses: { 200: { description: "Ranked candidates" } } } },
    "/admin/review/shortlists/{requestId}/confirm":        { post: { tags: ["Admin – Review"], summary: "Confirm top-N shortlist (admin_lead+)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { selections: [{ candidate_id: "uuid", submission_id: "uuid", rank: 1 }, { candidate_id: "uuid2", submission_id: "uuid2", rank: 2 }, { candidate_id: "uuid3", submission_id: "uuid3", rank: 3 }] } } } }, responses: { 200: { description: "Shortlist confirmed" } } } },
    "/admin/review/shortlists/{requestId}/deliver":        { post: { tags: ["Admin – Review"], summary: "Deliver shortlist — settlement record created, employer notified", security: [{ bearerAuth: [] }], responses: { 200: { description: "Delivered with final_charge and credit_returned" } } } },

    // ── ADMIN WALLET + NOTIFICATIONS ────────────────────────────────────────
    "/admin/wallet":                  { get: { tags: ["Admin – Wallet"], summary: "Revenue overview + transactions — ?filter=oldest|latest|successful|failed", security: [{ bearerAuth: [] }], responses: { 200: { description: "Wallet data" } } } },
    "/admin/notifications":           { get:  { tags: ["Admin – Notifications"], summary: "Admin notifications — ?unread=true", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/admin/notifications/mark-read": { post: { tags: ["Admin – Notifications"], summary: "Mark notifications read — body { ids: [uuid] } or omit", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── EMPLOYER AUTH + PROFILE + DASHBOARD + WORKSPACE ─────────────────────
    "/employer/auth/register": { post: { tags: ["Employer – Auth"], summary: "Register as employer", description: "Same behaviour as /auth/register but role-locked to employer. **DEV MODE:** response includes `data.dev_otp` when `DEV_MODE=true`.", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!", role: "employer", first_name: "John", last_name: "Doe" } } } }, responses: { 201: { description: "Account created. Includes dev_otp in dev mode." } } } },
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
      post: { tags: ["Employer – Requests"], summary: "Create draft request — deposit auto-calculated (₦800k fee + cap × ₦180k)", description: "Set `custom_rubric` to override the challenge's default rubric for this request only. Weights must sum to 100.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: REQUEST_CREATE_EXAMPLE } } }, responses: { 201: { description: "Draft created" } } },
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
        description: "Behaviour depends on SKIP_PAYMENT env flag. When true (default in non-production), the request goes straight to `published` and the payment is auto-marked success. The response includes `payment.skip: true` so the frontend can skip the redirect. When false (production), Paystack is called and `payment.authorization_url` must be redirected to.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Published. Response: { request, payment: { authorization_url, skip, status } }" },
          400: { description: "NOT_DRAFT or NO_CHALLENGE or RUBRIC_WEIGHT_INVALID" },
        },
      },
    },

    // NEW: List submissions for one of the employer's own requests
    "/employer/requests/{id}/submissions": {
      get: {
        tags: ["Employer – Requests"],
        summary: "List submissions for one of your requests",
        description: "Returns every candidate who has submitted to this request, with status, submitted_at, total_score (if scored), and basic candidate info. Artifact URLs and reviewer notes are NOT included until the shortlist is delivered — use /employer/shortlists/:id for that.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Array of submissions" },
          404: { description: "REQUEST_NOT_FOUND — request does not exist or is not yours" },
        },
      },
    },

    // NEW: Rerun a previous request as a fresh draft
    "/employer/requests/{id}/rerun": {
      post: {
        tags: ["Employer – Requests"],
        summary: "Duplicate a previous request as a new draft",
        description: "Mirrors the 'Rerun request' button on the shortlist detail page (Figma screen 13). Creates a new draft preserving title (with ' (rerun)' suffix), challenge, role_type, role_level, cap, shortlist_size, and custom_rubric. Deadline is intentionally NOT carried over — set a fresh one before publishing.",
        security: [{ bearerAuth: [] }],
        responses: {
          201: { description: "New draft request created" },
          404: { description: "REQUEST_NOT_FOUND" },
        },
      },
    },

    // ── EMPLOYER SHORTLISTS / BILLING / PAYMENTS ────────────────────────────
    "/employer/shortlists":     { get: { tags: ["Employer – Shortlists"], summary: "All delivered shortlists", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlists" } } } },
    "/employer/shortlists/{id}":{ get: { tags: ["Employer – Shortlists"], summary: "Single shortlist with evidence pack (top-N)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Evidence pack of shortlisted candidates only" } } } },

    // NEW: Pay-to-unlock the full talent list
    "/employer/shortlists/{id}/unlock": {
      post: {
        tags: ["Employer – Shortlists"],
        summary: "Pay to unlock the full talent list (Figma screen 14)",
        description: "Initiates a payment to access EVERY scored candidate, not just the top-N shortlist. Cost defaults to ₦240,000 (configurable via FULL_LIST_UNLOCK_NGN env var). Behaviour depends on SKIP_PAYMENT — see /publish for the same pattern. Returns 400 SHORTLIST_NOT_DELIVERED if the shortlist is not yet in `shortlisted` status.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Payment initiated. Response: { request_id, amount_ngn, payment: {...skip}, unlocked }" },
          400: { description: "SHORTLIST_NOT_DELIVERED" },
        },
      },
    },

    // NEW: Read the full candidate list once unlocked
    "/employer/shortlists/{id}/full-list": {
      get: {
        tags: ["Employer – Shortlists"],
        summary: "Get every scored candidate — requires unlock payment",
        description: "Returns every scored submission ranked by total_score, including those not in the top-N shortlist. Returns 400 FULL_LIST_LOCKED if the unlock fee has not been paid.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Full ranked list of scored candidates" },
          400: { description: "FULL_LIST_LOCKED — call /shortlists/:id/unlock first" },
        },
      },
    },

    // NEW: Export the shortlist as CSV
    "/employer/shortlists/{id}/export.csv": {
      get: {
        tags: ["Employer – Shortlists"],
        summary: "Download the shortlist as CSV",
        description: "Returns text/csv (NOT the JSON envelope) with Content-Disposition attachment. Columns: rank, candidate_name, email, total_score, artifact_urls, reviewer_notes.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "CSV file download" } },
      },
    },

    "/employer/billing": { get: { tags: ["Employer – Billing"], summary: "Billing history (all requests)", security: [{ bearerAuth: [] }], responses: { 200: { description: "Billing data with summary, requests, settlements, payments" } } } },

    // NEW: Per-request billing detail
    "/employer/billing/{id}": {
      get: {
        tags: ["Employer – Billing"],
        summary: "Billing breakdown for one request (Figma screen 15 right)",
        description: "Returns line items (admin_setup_fee, prepaid_deposit, final_charge, credit_returned, full_list_unlock) plus full transaction history for that request, plus the settlement record once delivered.",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Per-request billing breakdown" } },
      },
    },

    "/employer/payments/initiate":            { post: { tags: ["Employer – Billing"], summary: "Initiate Paystack payment (manual, for ad-hoc top-ups)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { amount_ngn: 4580000, job_request_id: "uuid", payment_type: "deposit" } } } }, responses: { 200: { description: "authorization_url returned" } } } },
    "/employer/payments/verify/{reference}":  { get:  { tags: ["Employer – Billing"], summary: "Verify a payment by reference", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payment status" } } } },
    "/employer/payments/history":             { get:  { tags: ["Employer – Billing"], summary: "All payments by this employer", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payments array" } } } },

    "/employer/notifications":                { get:  { tags: ["Employer – Notifications"], summary: "Notifications — ?unread=true", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/employer/notifications/mark-read":      { post: { tags: ["Employer – Notifications"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── CANDIDATE ───────────────────────────────────────────────────────────
    "/candidate/auth/register": { post: { tags: ["Candidate – Auth"], summary: "Register as candidate", description: "Same behaviour as /auth/register but role-locked to candidate. **DEV MODE:** response includes `data.dev_otp` when `DEV_MODE=true` — use this to test candidate accounts without depending on email delivery.", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } }, responses: { 201: { description: "Account created. Includes dev_otp in dev mode." } } } },
    "/candidate/auth/login":    { post: { tags: ["Candidate – Auth"], summary: "Candidate login", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + candidate user" } } } },
    "/candidate/challenges":      { get: { tags: ["Candidate – Challenges"], summary: "Browse open challenges — NO AUTH. ?search=keyword", responses: { 200: { description: "Published requests" } } } },
    "/candidate/challenges/{id}": { get: { tags: ["Candidate – Challenges"], summary: "Challenge detail — NO AUTH", responses: { 200: { description: "Full challenge detail" } } } },
    "/candidate/challenges/{id}/submit": { post: { tags: ["Candidate – Submissions"], summary: "Submit to challenge — integrity_declared must be true", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { artifact_urls: ["https://github.com/user/repo"], artifact_type: "link", submission_statement: "All my own work.", integrity_declared: true } } } }, responses: { 201: { description: "Submission received" }, 409: { description: "Already submitted" }, 403: { description: "Challenge closed or deadline passed" } } } },
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

export function setupSwagger(app: Hono) {
  app.get("/openapi.json", (c) => c.json(openApiDoc));
  app.get("/docs", (c) => c.html(SWAGGER_HTML));
}
