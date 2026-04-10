import { Hono } from "hono";

// ─── Swagger UI served as raw HTML (Vercel-compatible) ───────────────────────
// @hono/swagger-ui internally calls c.req.header() which breaks on Vercel's
// edge runtime. Serving the HTML directly bypasses that entirely.

const SWAGGER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hack51 API Docs</title>
  <meta name="description" content="Hack51 Evidence-Based Hiring Platform API" />
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

const openApiDoc = {
  openapi: "3.1.0",
  info: {
    title: "Hack51 API",
    version: "1.0.0",
    description: `## Evidence-Based Hiring Platform API

### How to authenticate
1. Call **POST /auth/login** or a role-specific login endpoint
2. Copy the \`access_token\` from the response \`data\` field
3. Click **🔓 Authorize** (top right)
4. Paste ONLY the token — no "Bearer " prefix, not the password hash
   - \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`
   -  \`Bearer eyJ...\` or \`$2b$12$...\` (that's a bcrypt hash)
5. Click **Authorize → Close**

### Default system admin
- **Email:** admin@hack51.com  
- **Password:** Admin@Hack51!
- ⚠ Change immediately via \`PATCH /admin/profile\`

### Response format
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
  },
  tags: [
    { name: "Auth", description: "Shared auth — register, verify, login, refresh, reset password" },
    { name: "Shared – Auth", description: "Token refresh, logout, /me" },
    { name: "Admin – Auth", description: "Admin login and account management" },
    { name: "Admin – Dashboard", description: "Overview statistics and charts" },
    { name: "Admin – Catalog", description: "Manage roles and challenges" },
    { name: "Admin – Review", description: "Triage, scoring, shortlist delivery" },
    { name: "Admin – Wallet", description: "Revenue and transaction overview" },
    { name: "Admin – Profile", description: "Admin profile settings" },
    { name: "Employer – Auth", description: "Employer registration and login" },
    { name: "Employer – Dashboard", description: "Employer overview stats" },
    { name: "Employer – Requests", description: "Create and manage hiring requests" },
    { name: "Employer – Shortlists", description: "View delivered shortlists with evidence packs" },
    { name: "Employer – Billing", description: "Deposits, charges, and settlement" },
    { name: "Employer – Workspace", description: "Company profile" },
    { name: "Candidate – Auth", description: "Candidate registration and login" },
    { name: "Candidate – Challenges", description: "Browse open challenges (public, no auth needed)" },
    { name: "Candidate – Submissions", description: "Submit and track submissions" },
    { name: "Candidate – Profile", description: "Candidate profile" },
    { name: "Payments", description: "Paystack webhook (called by Paystack)" },
  ],
  paths: {
    "/health": { get: { tags: ["Auth"], summary: "Health check", responses: { 200: { description: "OK" } } } },

    // ── SHARED AUTH ───────────────────────────────────────────────────────────
    "/auth/register":         { post: { tags: ["Auth"], summary: "Register (candidate or employer)", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } }, responses: { 201: { description: "Account created, 6-digit OTP sent to email" }, 409: { description: "Email already exists" }, 422: { description: "Validation error" } } } },
    "/auth/verify-email":     { post: { tags: ["Auth"], summary: "Verify email with 6-digit OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "482913" } } } }, responses: { 200: { description: "Email verified, welcome email sent" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/resend-otp":       { post: { tags: ["Auth"], summary: "Resend verification OTP", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "OTP resent" } } } },
    "/auth/login":            { post: { tags: ["Auth"], summary: "Login (any role) — returns access_token + refresh_token", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + user in data field" }, 401: { description: "Invalid credentials" }, 403: { description: "Email not verified or account inactive" } } } },
    "/auth/refresh":          { post: { tags: ["Shared – Auth"], summary: "Rotate refresh token — old token revoked, new pair issued", requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "New token pair" }, 401: { description: "Invalid or reused token — all sessions revoked" } } } },
    "/auth/logout":           { post: { tags: ["Shared – Auth"], summary: "Logout — revoke refresh token", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { refresh_token: "eyJ..." } } } }, responses: { 200: { description: "Logged out" } } } },
    "/auth/forgot-password":  { post: { tags: ["Auth"], summary: "Request password reset — 6-digit OTP sent to email", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com" } } } }, responses: { 200: { description: "Reset OTP sent (same response regardless of whether email exists)" } } } },
    "/auth/verify-reset-otp": { post: { tags: ["Auth"], summary: "Verify reset OTP → returns reset_token", requestBody: { required: true, content: { "application/json": { example: { email: "user@example.com", otp: "391045" } } } }, responses: { 200: { description: "reset_token returned — use in next step" }, 400: { description: "Invalid or expired OTP" } } } },
    "/auth/reset-password":   { post: { tags: ["Auth"], summary: "Set new password using reset_token — all sessions revoked", requestBody: { required: true, content: { "application/json": { example: { reset_token: "eyJ...", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Password changed, confirmation email sent" } } } },
    "/auth/me":               { get: { tags: ["Shared – Auth"], summary: "Get current authenticated user (any role)", security: [{ bearerAuth: [] }], responses: { 200: { description: "User profile" }, 401: { description: "Invalid or expired token" } } } },

    // ── ADMIN AUTH ────────────────────────────────────────────────────────────
    "/admin/auth/login":   { post: { tags: ["Admin – Auth"], summary: "Admin login — admin_reviewer, admin_lead, system_admin only", requestBody: { required: true, content: { "application/json": { example: { email: "admin@hack51.com", password: "Admin@Hack51!" } } } }, responses: { 200: { description: "Tokens + admin user" }, 403: { description: "Not an admin role (WRONG_ROLE_LOGIN)" } } } },
    "/admin/auth/me":      { get:  { tags: ["Admin – Auth"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Admin profile" } } } },
    "/admin/auth/create":  { post: { tags: ["Admin – Auth"], summary: "Create admin account — system_admin only. Setup OTP emailed.", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { email: "reviewer@hack51.com", password: "SecurePass1!", role: "admin_reviewer", first_name: "Jane" } } } }, responses: { 201: { description: "Admin created, OTP emailed for first login" }, 403: { description: "Only system_admin can create admin accounts" } } } },

    // ── ADMIN PROFILE ─────────────────────────────────────────────────────────
    "/admin/profile": {
      get:   { tags: ["Admin – Profile"], summary: "Get admin profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } },
      patch: { tags: ["Admin – Profile"], summary: "Update name, avatar, or change password", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "Elvis", old_password: "Admin@Hack51!", new_password: "NewAdmin@51!" } } } }, responses: { 200: { description: "Updated" } } },
    },

    // ── ADMIN DASHBOARD ───────────────────────────────────────────────────────
    "/admin/dashboard": { get: { tags: ["Admin – Dashboard"], summary: "Stats: submissions received, invalid, evaluated, shortlists delivered + charts", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data with evaluations_per_day chart and requests_overview donut data" } } } },

    // ── ADMIN USERS ───────────────────────────────────────────────────────────
    "/admin/users":                        { get:   { tags: ["Admin – Auth"], summary: "List all users — ?role=candidate|employer|admin_reviewer|admin_lead|system_admin&search=email", security: [{ bearerAuth: [] }], responses: { 200: { description: "Users list" } } } },
    "/admin/users/{userId}/toggle-active": { patch: { tags: ["Admin – Auth"], summary: "Activate or deactivate a user account", security: [{ bearerAuth: [] }], responses: { 200: { description: "Status toggled" } } } },

    // ── ADMIN CATALOG: ROLES ──────────────────────────────────────────────────
    "/admin/catalog/roles":      {
      get:  { tags: ["Admin – Catalog"], summary: "List all roles — ?active=false to include inactive", security: [{ bearerAuth: [] }], responses: { 200: { description: "Roles with skill levels and challenges" } } },
      post: { tags: ["Admin – Catalog"], summary: "Create role (admin_lead+ only)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { name: "Software Engineer", description: "Full-stack engineer", skill_levels: ["entry-level", "mid-level", "senior"], capabilities: [{ title: "API Design", summary: "Design RESTful APIs" }] } } } }, responses: { 201: { description: "Role created. Role can now be accessed by employers." } } },
    },
    "/admin/catalog/roles/{id}": {
      get:    { tags: ["Admin – Catalog"], summary: "Get role detail with challenges and rubrics", security: [{ bearerAuth: [] }], responses: { 200: { description: "Role detail" } } },
      put:    { tags: ["Admin – Catalog"], summary: "Update role name, description, or active status", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { name: "Updated Name", is_active: true } } } }, responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Admin – Catalog"], summary: "Delete role — all associated challenges deleted", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } },
    },

    // ── ADMIN CATALOG: CHALLENGES ─────────────────────────────────────────────
    "/admin/catalog/challenges":      {
      get:  { tags: ["Admin – Catalog"], summary: "List all challenges — ?active=false to include inactive", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenges with rubric" } } },
      post: { tags: ["Admin – Catalog"], summary: "Create challenge with rubric — weights MUST sum to 100", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { catalog_role_id: "uuid-here", title: "API Optimization Challenge", summary: "Improve a sluggish REST API", scenario: "Your team manages a backend API...", deliverables: ["Source code repo", "README.md", "Performance report"], submission_format: "Single ZIP or public GitHub link", constraints_text: "Max 10 pages. No external libraries not in requirements.", submission_requirements: "Provide a public GitHub repo with a comprehensive README.", rubric_criteria: [{ title: "Code Quality", description: "Code patterns, readability, maintainability", weight: 30 }, { title: "Code Technicality", description: "Technical depth and architectural decisions", weight: 30 }, { title: "Code Functionality", description: "Does it work correctly and efficiently", weight: 40 }] } } } }, responses: { 201: { description: "Challenge created" }, 422: { description: "Rubric weights do not sum to 100" } } },
    },
    "/admin/catalog/challenges/{id}": {
      get:    { tags: ["Admin – Catalog"], summary: "Get challenge detail with full rubric", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge detail" } } },
      put:    { tags: ["Admin – Catalog"], summary: "Update challenge and/or rubric criteria", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Admin – Catalog"], summary: "Delete challenge", security: [{ bearerAuth: [] }], responses: { 200: { description: "Deleted" } } },
    },

    // ── ADMIN REVIEW: QUEUE ───────────────────────────────────────────────────
    "/admin/review/requests":                             { get:  { tags: ["Admin – Review"], summary: "Active request queue — ?status=published|evaluating|shortlisted", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests with employer and company info" } } } },
    "/admin/review/requests/{requestId}/submissions":     { get:  { tags: ["Admin – Review"], summary: "All submissions for a request with status stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Stats + submissions list" } } } },
    "/admin/review/submissions/{id}":                     { get:  { tags: ["Admin – Review"], summary: "Full submission detail — candidate info, artifacts, rubric snapshot, scores", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission detail" } } } },
    "/admin/review/submissions/{id}/triage":              { post: { tags: ["Admin – Review"], summary: "Triage submission: valid → under_review | invalid → rejected | returned → returned", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { decision: "valid", reason: "All deliverables present and format correct" } } } }, responses: { 200: { description: "Triaged. Candidate notified via in-app notification." } } } },
    "/admin/review/submissions/{id}/score":               { post: { tags: ["Admin – Review"], summary: "Score submission — total_score auto-calculated as weighted sum", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { scores: [{ criterion_id: "uuid", criterion_title: "Code Quality", weight: 30, score_percent: 85 }, { criterion_id: "uuid2", criterion_title: "Code Technicality", weight: 30, score_percent: 90 }, { criterion_id: "uuid3", criterion_title: "Code Functionality", weight: 40, score_percent: 80 }], reviewer_notes: "Strong technical proficiency. Clean architecture." } } } }, responses: { 200: { description: "Scored. total_score = (30×85 + 30×90 + 40×80) / 100 = 85" } } } },

    // ── ADMIN REVIEW: SHORTLISTS ──────────────────────────────────────────────
    "/admin/review/shortlists":                           { get:  { tags: ["Admin – Review"], summary: "Shortlist queue — all requests in evaluating/shortlisted status", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlist jobs" } } } },
    "/admin/review/shortlists/{requestId}/candidates":    { get:  { tags: ["Admin – Review"], summary: "Scored candidates ranked by total_score — select top N from this list", security: [{ bearerAuth: [] }], responses: { 200: { description: "Ranked candidates with score breakdowns" } } } },
    "/admin/review/shortlists/{requestId}/confirm":       { post: { tags: ["Admin – Review"], summary: "Confirm top-N shortlist selection (admin_lead+ only)", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { selections: [{ candidate_id: "uuid", submission_id: "uuid", rank: 1 }, { candidate_id: "uuid2", submission_id: "uuid2", rank: 2 }, { candidate_id: "uuid3", submission_id: "uuid3", rank: 3 }] } } } }, responses: { 200: { description: "Shortlist confirmed. Ready to deliver." } } } },
    "/admin/review/shortlists/{requestId}/deliver":       { post: { tags: ["Admin – Review"], summary: "Deliver shortlist → employer notified, settlement record created, credit returned calculated", security: [{ bearerAuth: [] }], responses: { 200: { description: "Delivered. final_charge and credit_returned in response." } } } },

    // ── ADMIN WALLET ──────────────────────────────────────────────────────────
    "/admin/wallet": { get: { tags: ["Admin – Wallet"], summary: "Revenue overview + transaction history — ?filter=oldest|latest|successful|failed", security: [{ bearerAuth: [] }], responses: { 200: { description: "Total revenue, deposits, credits, transactions" } } } },

    // ── ADMIN NOTIFICATIONS ───────────────────────────────────────────────────
    "/admin/notifications":           { get:  { tags: ["Admin – Dashboard"], summary: "Get notifications — ?unread=true for unread only", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/admin/notifications/mark-read": { post: { tags: ["Admin – Dashboard"], summary: "Mark notifications as read — body: { ids: [uuid] } or omit ids to mark all", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── EMPLOYER AUTH ─────────────────────────────────────────────────────────
    "/employer/auth/register": { post: { tags: ["Employer – Auth"], summary: "Register as employer — workspace auto-created after email verification", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!", role: "employer", first_name: "John", last_name: "Doe" } } } }, responses: { 201: { description: "Account created, OTP sent" } } } },
    "/employer/auth/login":    { post: { tags: ["Employer – Auth"], summary: "Employer login — employer role only", requestBody: { required: true, content: { "application/json": { example: { email: "cto@startup.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + employer user" }, 403: { description: "Not an employer account" } } } },

    // ── EMPLOYER PROFILE ──────────────────────────────────────────────────────
    "/employer/profile": {
      get:   { tags: ["Employer – Workspace"], summary: "Get employer profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } },
      patch: { tags: ["Employer – Workspace"], summary: "Update name, avatar, or password", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "John", old_password: "SecurePass1!", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Updated" } } },
    },

    // ── EMPLOYER DASHBOARD ────────────────────────────────────────────────────
    "/employer/dashboard": { get: { tags: ["Employer – Dashboard"], summary: "Stats: total requests, submissions, evaluations, shortlists delivered", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },

    // ── EMPLOYER WORKSPACE ────────────────────────────────────────────────────
    "/employer/workspace": {
      get:   { tags: ["Employer – Workspace"], summary: "Get company workspace profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Workspace" } } },
      patch: { tags: ["Employer – Workspace"], summary: "Update company details", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { company_name: "Acme Corp", company_url: "https://acme.com", industry: "Technology", team_size: "11-50" } } } }, responses: { 200: { description: "Updated" } } },
    },

    // ── EMPLOYER CATALOG ──────────────────────────────────────────────────────
    "/employer/catalog/roles":           { get: { tags: ["Employer – Requests"], summary: "Browse available roles to base your request on", security: [{ bearerAuth: [] }], responses: { 200: { description: "Active roles" } } } },
    "/employer/catalog/challenges":      { get: { tags: ["Employer – Requests"], summary: "Browse available challenges", security: [{ bearerAuth: [] }], responses: { 200: { description: "Active challenges" } } } },
    "/employer/catalog/challenges/{id}": { get: { tags: ["Employer – Requests"], summary: "Challenge detail with full rubric preview", security: [{ bearerAuth: [] }], responses: { 200: { description: "Challenge + rubric" } } } },

    // ── EMPLOYER REQUESTS ─────────────────────────────────────────────────────
    "/employer/requests":              {
      get:  { tags: ["Employer – Requests"], summary: "List all requests — ?drafts=true for drafts only | ?status=published|evaluating|shortlisted", security: [{ bearerAuth: [] }], responses: { 200: { description: "Requests" } } },
      post: { tags: ["Employer – Requests"], summary: "Create draft request — deposit auto-calculated: ₦800k admin fee + cap × ₦180k", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { title: "Senior Product Designer", role_type: "Product Designer", role_level: "senior", challenge_id: "uuid-from-catalog", challenge_cap: 21, shortlist_size: 5, deadline: "2025-06-01T00:00:00Z" } } } }, responses: { 201: { description: "Draft created. deposit_amount calculated and returned." } } },
    },
    "/employer/requests/{id}":         {
      get:    { tags: ["Employer – Requests"], summary: "Request detail — includes billing summary and live submission stats", security: [{ bearerAuth: [] }], responses: { 200: { description: "Request + submission_stats + billing" } } },
      patch:  { tags: ["Employer – Requests"], summary: "Update draft request fields", security: [{ bearerAuth: [] }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Employer – Requests"], summary: "Close request", security: [{ bearerAuth: [] }], responses: { 200: { description: "Closed" } } },
    },
    "/employer/requests/{id}/publish":  { post: { tags: ["Employer – Requests"], summary: "Publish request — locks challenge+rubric snapshot, initiates Paystack deposit payment", security: [{ bearerAuth: [] }], responses: { 200: { description: "Published. payment.authorization_url returned for Paystack redirect." } } } },

    // ── EMPLOYER SHORTLISTS ───────────────────────────────────────────────────
    "/employer/shortlists":      { get: { tags: ["Employer – Shortlists"], summary: "All delivered shortlists with full evidence packs", security: [{ bearerAuth: [] }], responses: { 200: { description: "Shortlists" } } } },
    "/employer/shortlists/{id}": { get: { tags: ["Employer – Shortlists"], summary: "Single shortlist — Top N candidates with artifacts, scores, reviewer notes", security: [{ bearerAuth: [] }], responses: { 200: { description: "Evidence pack" } } } },

    // ── EMPLOYER BILLING ──────────────────────────────────────────────────────
    "/employer/billing": { get: { tags: ["Employer – Billing"], summary: "Billing history: deposits paid, final charges, credit returned, transaction records", security: [{ bearerAuth: [] }], responses: { 200: { description: "Billing data" } } } },

    // ── EMPLOYER PAYMENTS ─────────────────────────────────────────────────────
    "/employer/payments/initiate":           { post: { tags: ["Employer – Billing"], summary: "Initiate Paystack payment — returns authorization_url to redirect user", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { amount_ngn: 4580000, job_request_id: "uuid", payment_type: "deposit" } } } }, responses: { 200: { description: "payment_reference + authorization_url" } } } },
    "/employer/payments/verify/{reference}": { get:  { tags: ["Employer – Billing"], summary: "Verify payment after Paystack redirect", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payment status" } } } },
    "/employer/payments/history":            { get:  { tags: ["Employer – Billing"], summary: "Payment transaction history", security: [{ bearerAuth: [] }], responses: { 200: { description: "Payments" } } } },

    // ── EMPLOYER NOTIFICATIONS ────────────────────────────────────────────────
    "/employer/notifications":           { get:  { tags: ["Employer – Dashboard"], summary: "Notifications — ?unread=true for unread only", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/employer/notifications/mark-read": { post: { tags: ["Employer – Dashboard"], summary: "Mark notifications read — body: { ids: [uuid] } or omit to mark all", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── CANDIDATE AUTH ────────────────────────────────────────────────────────
    "/candidate/auth/register": { post: { tags: ["Candidate – Auth"], summary: "Register as candidate — candidate profile created after email verification", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!", role: "candidate", first_name: "Ada", last_name: "Lovelace" } } } }, responses: { 201: { description: "Account created, OTP sent" } } } },
    "/candidate/auth/login":    { post: { tags: ["Candidate – Auth"], summary: "Candidate login — candidate role only", requestBody: { required: true, content: { "application/json": { example: { email: "talent@example.com", password: "SecurePass1!" } } } }, responses: { 200: { description: "Tokens + candidate user" }, 403: { description: "Not a candidate account" } } } },

    // ── CANDIDATE CHALLENGES (PUBLIC — NO AUTH) ───────────────────────────────
    "/candidate/challenges":      { get: { tags: ["Candidate – Challenges"], summary: "Browse all open challenges — NO AUTH REQUIRED. ?search=keyword to filter", responses: { 200: { description: "Open published requests with challenge detail and company info" } } } },
    "/candidate/challenges/{id}": { get: { tags: ["Candidate – Challenges"], summary: "Challenge detail with full rubric — NO AUTH REQUIRED", responses: { 200: { description: "Full challenge detail" } } } },

    // ── CANDIDATE SUBMISSIONS ─────────────────────────────────────────────────
    "/candidate/challenges/{id}/submit": { post: { tags: ["Candidate – Submissions"], summary: "Submit to challenge — integrity_declared must be true", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { artifact_urls: ["https://github.com/user/repo"], artifact_type: "link", submission_statement: "AI was used only for brainstorming. All work is my own.", integrity_declared: true } } } }, responses: { 201: { description: "Submission received" }, 409: { description: "Already submitted (resubmit only allowed when status is returned)" }, 403: { description: "Challenge closed or deadline passed" } } } },
    "/candidate/submissions":            { get:  { tags: ["Candidate – Submissions"], summary: "My submissions with status, triage decision, and score", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submissions list" } } } },
    "/candidate/submissions/{id}":       { get:  { tags: ["Candidate – Submissions"], summary: "Single submission detail", security: [{ bearerAuth: [] }], responses: { 200: { description: "Submission" } } } },

    // ── CANDIDATE PROFILE ─────────────────────────────────────────────────────
    "/candidate/profile": {
      get:   { tags: ["Candidate – Profile"], summary: "Get candidate profile", security: [{ bearerAuth: [] }], responses: { 200: { description: "Profile" } } },
      patch: { tags: ["Candidate – Profile"], summary: "Update bio, skills, experience, location, links", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { bio: "Full-stack developer, 5 years experience", skills: ["TypeScript", "React", "Node.js"], experience_years: 5, location: "Lagos, Nigeria", linkedin_url: "https://linkedin.com/in/ada", portfolio_url: "https://ada.dev" } } } }, responses: { 200: { description: "Updated" } } },
    },
    "/candidate/settings": { patch: { tags: ["Candidate – Profile"], summary: "Update account settings — name, avatar, password change", security: [{ bearerAuth: [] }], requestBody: { required: true, content: { "application/json": { example: { first_name: "Ada", old_password: "SecurePass1!", new_password: "NewSecure1!" } } } }, responses: { 200: { description: "Updated" } } } },
    "/candidate/dashboard": { get: { tags: ["Candidate – Submissions"], summary: "Dashboard — submission stats, shortlists, recent activity", security: [{ bearerAuth: [] }], responses: { 200: { description: "Dashboard data" } } } },

    // ── CANDIDATE NOTIFICATIONS ───────────────────────────────────────────────
    "/candidate/notifications":           { get:  { tags: ["Candidate – Submissions"], summary: "Notifications — ?unread=true for unread only", security: [{ bearerAuth: [] }], responses: { 200: { description: "Notifications + unread count" } } } },
    "/candidate/notifications/mark-read": { post: { tags: ["Candidate – Submissions"], summary: "Mark notifications read", security: [{ bearerAuth: [] }], responses: { 200: { description: "Marked" } } } },

    // ── PAYMENTS ──────────────────────────────────────────────────────────────
    "/payments/webhook": { post: { tags: ["Payments"], summary: "Paystack webhook — Paystack calls this automatically on payment events", responses: { 200: { description: "Received" } } } },
  },
};

export function setupSwagger(app: Hono) {
  app.get("/openapi.json", (c) => c.json(openApiDoc));
  app.get("/docs", (c) => c.html(SWAGGER_HTML));
}
