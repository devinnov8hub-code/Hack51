# Hack51 — Frontend Integration Guide

> Audience: the Next.js frontend engineer integrating against the Hack51 API.
> Backend: Hono on Vercel, base URL `https://hack51-backend.vercel.app` (replace
> with your actual deployment). Local dev: `http://localhost:3000`.
> All endpoints return the same envelope (see §1.4). All authenticated routes
> use `Authorization: Bearer <access_token>`.

---

## Table of contents

1. [Fundamentals](#1-fundamentals)
   - 1.1 [Tech stack assumptions](#11-tech-stack-assumptions)
   - 1.2 [Environment variables](#12-environment-variables)
   - 1.3 [Setting up the API client](#13-setting-up-the-api-client)
   - 1.4 [Response envelope (every endpoint)](#14-response-envelope-every-endpoint)
   - 1.5 [Error codes you will see](#15-error-codes-you-will-see)
   - 1.6 [Token strategy with Next.js cookies](#16-token-strategy-with-nextjs-cookies)
   - 1.7 [Route protection in middleware.ts](#17-route-protection-in-middlewarets)
2. [Auth flows (shared)](#2-auth-flows-shared)
   - 2.1 Register → verify email → login
   - 2.2 Forgot password → verify reset OTP → reset
   - 2.3 Refresh token rotation
   - 2.4 Logout
3. [Admin app](#3-admin-app)
   - 3.1 Admin login + dashboard
   - 3.2 Catalog: roles (CRUD)
   - 3.3 Catalog: challenges (CRUD)
   - 3.4 Catalog: proposal review queue
   - 3.5 Review pipeline: queue → triage → score → shortlist → deliver
   - 3.6 Wallet, users management, notifications
4. [Employer app](#4-employer-app)
   - 4.1 Employer signup + workspace
   - 4.2 Dashboard
   - 4.3 Hiring wizard (the main flow)
   - 4.4 Custom rubric per request
   - 4.5 Propose a custom role / challenge (catalog-miss path)
   - 4.6 Publish + Paystack handoff
   - 4.7 Shortlists + billing
5. [Candidate app](#5-candidate-app)
   - 5.1 Public challenge browsing (no auth)
   - 5.2 Signup + profile
   - 5.3 Submit + track + resubmit
6. [State machines + status reference](#6-state-machines--status-reference)
7. [Recipes](#7-recipes)
   - 7.1 Server Action calling the API
   - 7.2 Optimistic UI for triage
   - 7.3 Polling vs. revalidation
   - 7.4 SWR / React Query setup
8. [Migration notes — what changed](#8-migration-notes--what-changed)

---

## 1. Fundamentals

### 1.1 Tech stack assumptions

This guide assumes:

- **Next.js 14+** with App Router (`/app` directory).
- **TypeScript** throughout.
- Either **`fetch` with React Server Components / Server Actions** (preferred for
  any call that needs the user's JWT, since cookies are server-only), or
  **SWR / React Query** for client-side polling and revalidation.
- **shadcn/ui or whatever component lib you've adopted** — the API doesn't care.
- Token storage: **`httpOnly` cookies** set from a Next.js Route Handler, never
  `localStorage`. Reasoning in §1.6.

If you're on Pages Router instead, every `app/api/*` route handler in this
guide maps 1:1 to a `pages/api/*` handler — only the imports change.

### 1.2 Environment variables

In your Next.js project `.env.local`:

```bash
# Required — base URL of the Hono API
NEXT_PUBLIC_API_URL=http://localhost:3000      # dev
# NEXT_PUBLIC_API_URL=https://hack51-api.vercel.app  # prod

# Optional — used in /payments callback redirect from Paystack
NEXT_PUBLIC_APP_URL=http://localhost:3001      # the Next.js app's own URL
```

`NEXT_PUBLIC_API_URL` is exposed to the browser. That's fine — the API URL
isn't a secret. Tokens never live in env vars.

### 1.3 Setting up the API client

Create a single typed client at `lib/api.ts`. It centralizes:

- The base URL.
- The bearer-token header (read from the cookie on the server).
- The response envelope unwrap.
- Error throwing.

```ts
// lib/api.ts
import { cookies } from "next/headers";

export type ApiResponse<T> = {
  status: "success" | "error";
  message: string;
  data: T | null;
  error: { code: string; details?: string } | null;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE = process.env.NEXT_PUBLIC_API_URL!;

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiOptions {
  method?: Method;
  body?: unknown;
  /** Override token (e.g. for a freshly-issued one before it's in cookies) */
  token?: string | null;
  /** Skip auth entirely (public endpoints) */
  skipAuth?: boolean;
  /** Default 'no-store' — opt into caching with 'force-cache' or revalidate */
  cache?: RequestCache;
  /** Pass-through to Next's fetch revalidation tag */
  next?: { revalidate?: number; tags?: string[] };
}

/**
 * Server-side API call. Reads the access_token cookie automatically.
 * Use this in Server Components, Server Actions, and Route Handlers.
 */
export async function api<T = unknown>(
  path: string,
  opts: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!opts.skipAuth) {
    const token = opts.token ?? cookies().get("access_token")?.value;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache ?? "no-store",
    next: opts.next,
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    status: "error",
    message: "Invalid JSON from API",
    data: null,
    error: { code: "PARSE_ERROR" },
  }));

  if (json.status === "error" || !res.ok) {
    throw new ApiError(
      res.status,
      json.error?.code ?? "UNKNOWN",
      json.message ?? "Request failed",
      json.error?.details,
    );
  }
  return json.data as T;
}
```

For browser-only client components, you'll want a parallel version that
proxies through Next's API routes (so the JWT cookie travels server-side):

```ts
// lib/api-client.ts  — for use in "use client" components
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await res.json();
  if (json.status === "error") {
    throw new Error(json.message);
  }
  return json.data;
}
```

And the proxy itself:

```ts
// app/api/proxy/[...path]/route.ts
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_URL!;

async function forward(req: Request, params: { path: string[] }) {
  const path = "/" + params.path.join("/");
  const url = new URL(req.url);
  const target = `${BASE}${path}${url.search}`;

  const token = cookies().get("access_token")?.value;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
}

export async function GET(req: Request, ctx: { params: { path: string[] } })   { return forward(req, ctx.params); }
export async function POST(req: Request, ctx: { params: { path: string[] } })  { return forward(req, ctx.params); }
export async function PUT(req: Request, ctx: { params: { path: string[] } })   { return forward(req, ctx.params); }
export async function PATCH(req: Request, ctx: { params: { path: string[] } }) { return forward(req, ctx.params); }
export async function DELETE(req: Request, ctx: { params: { path: string[] } }){ return forward(req, ctx.params); }
```

Now `apiClient("/employer/dashboard")` from a `"use client"` component goes
through `/api/proxy/employer/dashboard` → reads the cookie → forwards to Hono.

### 1.4 Response envelope (every endpoint)

**Every** response from the Hack51 API is wrapped in this exact shape:

```jsonc
{
  "status": "success",        // or "error"
  "message": "Login successful.",
  "data": { /* the actual payload */ },
  "error": null               // or { "code": "...", "details": "..." }
}
```

Your `api()` helper unwraps `.data` and throws `ApiError` on `status: "error"`.
**Never** read response fields without going through the envelope.

### 1.5 Error codes you will see

These are the codes the backend returns inside `error.code`. Use them to drive
UI (e.g. show "wrong password" inline vs. redirect to verify-email page).

| HTTP | code                           | When                                          |
|------|--------------------------------|-----------------------------------------------|
| 400  | `BAD_REQUEST`                  | Generic 400                                   |
| 400  | `OTP_INVALID` / `OTP_EXPIRED`  | Wrong / expired OTP code                      |
| 400  | `NO_CHALLENGE`                 | Tried to publish without picking a challenge  |
| 400  | `RUBRIC_WEIGHT_INVALID`        | custom_rubric weights don't sum to 100        |
| 400  | `OLD_PASSWORD_REQUIRED`        | Password change needs current password        |
| 400  | `WRONG_PASSWORD`               | Old password didn't match                     |
| 401  | `MISSING_TOKEN`                | No / malformed Authorization header           |
| 401  | `INVALID_TOKEN`                | JWT signature / expiry failed                 |
| 401  | `INVALID_CREDENTIALS`          | Email or password wrong on login              |
| 401  | `REFRESH_TOKEN_REUSE`          | Refresh token reused — all sessions revoked   |
| 403  | `FORBIDDEN` / `INSUFFICIENT_ROLE` | Wrong role for this endpoint               |
| 403  | `WRONG_ROLE_LOGIN`             | Used /admin/auth/login as a candidate, etc.   |
| 403  | `EMAIL_NOT_VERIFIED`           | Login blocked until OTP verified              |
| 403  | `ACCOUNT_INACTIVE`             | Admin disabled the account                    |
| 403  | `ADMIN_SELF_REGISTER_FORBIDDEN`| Tried to self-register as admin               |
| 403  | `CHALLENGE_CLOSED`             | Submission attempted on closed request        |
| 403  | `DEADLINE_PASSED`              | Submission past the deadline                  |
| 403  | `ROLE_NOT_OWNED` / `ROLE_REJECTED` | Proposal validation                       |
| 404  | `USER_NOT_FOUND`               | No account                                    |
| 404  | `WORKSPACE_NOT_FOUND`          | Employer hasn't completed workspace           |
| 404  | `PROFILE_NOT_FOUND`            | Candidate profile missing                     |
| 404  | `ROLE_NOT_FOUND` / `CHALLENGE_NOT_FOUND` / `REQUEST_NOT_FOUND` / `SUBMISSION_NOT_FOUND` / `SHORTLIST_NOT_FOUND` / `PROPOSAL_NOT_FOUND` / `PAYMENT_NOT_FOUND` | Resource missing |
| 409  | `EMAIL_EXISTS`                 | Registration with existing email              |
| 409  | `ALREADY_VERIFIED`             | Verify-email called on verified account       |
| 409  | `ALREADY_SUBMITTED`            | Candidate already submitted to this request   |
| 409  | `ALREADY_SHORTLISTED`          | Shortlist confirm called twice                |
| 422  | `VALIDATION_ERROR`             | Zod validation failed; `details` is the issues|
| 500  | `INTERNAL_ERROR`               | Something broke; check `details` in dev       |

### 1.6 Token strategy with Next.js cookies

The backend issues two tokens on login:

- `access_token` — JWT, **15-minute** TTL, used in `Authorization: Bearer ...`
- `refresh_token` — JWT, **30-day** TTL, single-use, **rotated** on each refresh

**Where to store them:**

| Token         | Storage                                | Why                                             |
|---------------|----------------------------------------|-------------------------------------------------|
| access_token  | `httpOnly`, `secure`, `sameSite=lax` cookie | XSS can't read it. Sent automatically.    |
| refresh_token | Same — `httpOnly` cookie               | Long-lived, more sensitive than access token    |

**Never** put either in `localStorage`. Any third-party script on your page
could exfiltrate them. The cookie path should be `/`.

Set them in a Route Handler after login:

```ts
// app/api/auth/login/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json();
  // The shared login auto-detects role; for role-specific logins use
  // /admin/auth/login, /employer/auth/login, /candidate/auth/login
  const data = await api<{
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; role: string };
  }>("/auth/login", { method: "POST", body, skipAuth: true });

  const jar = cookies();
  jar.set("access_token", data.access_token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: 60 * 15, // 15 min
  });
  jar.set("refresh_token", data.refresh_token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  jar.set("user_role", data.user.role, {
    httpOnly: false, // readable by client for routing logic
    secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ user: data.user });
}
```

Note `user_role` is **not** httpOnly — it's the only thing the client needs to
read for routing logic ("am I admin? show admin nav"). The actual auth token
stays sealed.

### 1.7 Route protection in middleware.ts

```ts
// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/", "/login", "/signup", "/verify-email", "/forgot-password",
  "/reset-password", "/challenges", // candidate browse is public
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("access_token")?.value;
  const role  = req.cookies.get("user_role")?.value;

  // Public paths and any /challenges/[id] (candidate browsing) — let through
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-gate the three apps
  if (pathname.startsWith("/admin") && !["admin_reviewer","admin_lead","system_admin"].includes(role ?? "")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/employer") && role !== "employer") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/dashboard") && role !== "candidate") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip static assets and Next internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

This gives you **synchronous, edge-fast** route protection. The middleware
doesn't decode the JWT — it just checks presence + role. The actual JWT
validity is enforced by the backend on every request, which is the only place
that matters.

---

## 2. Auth flows (shared)

The same auth machinery powers all three apps. Differences are only in the
**login endpoint** used (each role has a guarded login that rejects wrong
roles), and the **landing page** after success.

### 2.1 Register → verify email → login

#### Step 1 — Register

The user fills the signup form. The backend creates an unverified account and
emails a 6-digit OTP.

```http
POST /auth/register
Content-Type: application/json

{
  "email": "ada@startup.com",
  "password": "SecurePass1!",
  "role": "employer",                 // "employer" or "candidate" only
  "first_name": "Ada",
  "last_name": "Lovelace"
}
```

**Password rules** (these are enforced by the backend; mirror them in your form):
- Minimum 8 characters
- At least one uppercase, one lowercase, one number, one special char

**Response** (`201`):
```jsonc
{
  "status": "success",
  "message": "Employer account created. Check your email for a verification code.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "ada@startup.com",
      "role": "employer",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "is_verified": false
    }
  },
  "error": null
}
```

After this, **redirect to `/verify-email?email=<encoded>`**. Do NOT auto-login —
the user has no `is_verified: true` yet, so login will 403.

> **Role-specific signup endpoints exist too** — `POST /employer/auth/register`
> and `POST /candidate/auth/register`. They work the same as `/auth/register`
> but force the role server-side. Use them if you want compile-time safety on
> which role you're registering.

> **Heads-up — Figma-vs-backend mismatch:** the Figma signup screen has a
> "Company name" input on the same form. The backend `RegisterSchema` doesn't
> currently accept `company_name`. Either:
> 1. Send the company name in a follow-up `PATCH /employer/workspace` call
>    after the user verifies their email and logs in (recommended — workspace
>    is auto-created blank on verification, so PATCH lands on a real row), OR
> 2. Stash it in a cookie / localStorage on signup, then PATCH after first
>    login (better UX, doesn't lose the input if they close the tab).

#### Step 2 — Verify email (6-digit OTP)

The user types the 6-digit code from their email. OTP TTL is **10 minutes**.

```http
POST /auth/verify-email
Content-Type: application/json

{
  "email": "ada@startup.com",
  "otp": "482913"
}
```

**Response** (`200`):
```json
{
  "status": "success",
  "message": "Email verified successfully",
  "data": { "message": "Email verified successfully" },
  "error": null
}
```

On success: redirect to `/login` with a flash message ("Email verified —
sign in below"). The backend has now created the role-specific record
(workspace for employer, profile row for candidate).

**If OTP expired or wrong:**
- `400 OTP_EXPIRED` → show "Code expired. We'll send a new one." and call
  `POST /auth/resend-otp` immediately.
- `400 OTP_INVALID` → show "Wrong code. Try again." inline.

```http
POST /auth/resend-otp
Content-Type: application/json

{ "email": "ada@startup.com" }
```

#### Step 3 — Login

Use the **role-specific** login endpoint based on which app the user signed
into. This prevents an employer login form from accidentally letting a
candidate through.

| App        | Endpoint                  |
|------------|---------------------------|
| Admin      | `POST /admin/auth/login`  |
| Employer   | `POST /employer/auth/login` |
| Candidate  | `POST /candidate/auth/login` |
| (Generic)  | `POST /auth/login`        |

```http
POST /employer/auth/login
Content-Type: application/json

{ "email": "ada@startup.com", "password": "SecurePass1!" }
```

**Response** (`200`):
```jsonc
{
  "status": "success",
  "message": "Employer login successful.",
  "data": {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "user": {
      "id": "uuid", "email": "ada@startup.com", "role": "employer",
      "first_name": "Ada", "last_name": "Lovelace",
      "is_verified": true, "created_at": "2026-04-01T10:00:00Z"
    }
  },
  "error": null
}
```

Set both tokens as httpOnly cookies (see §1.6). **Then redirect** based on
role: employer → `/employer/dashboard`, etc.

**Common login errors:**

| Code                  | What happened                    | UI                                           |
|-----------------------|----------------------------------|----------------------------------------------|
| `INVALID_CREDENTIALS` | Wrong email or password          | Inline form error                            |
| `EMAIL_NOT_VERIFIED`  | OTP never confirmed              | Redirect to `/verify-email`, auto-resend OTP |
| `ACCOUNT_INACTIVE`    | Admin disabled the account       | "Contact support" page                       |
| `WRONG_ROLE_LOGIN`    | Used wrong login endpoint        | "This email is registered as a {role}"       |

### 2.2 Forgot password → verify reset OTP → reset

Three-step flow. The reset OTP is **single-use** and exchanging it returns a
short-lived `reset_token` (a JWT scoped to password reset only).

#### Step 1 — Request reset

```http
POST /auth/forgot-password
Content-Type: application/json

{ "email": "ada@startup.com" }
```

**Always returns 200** with the message "If that email is registered, a reset
code has been sent." This is intentional anti-enumeration — don't reveal
whether the email exists. Show that exact message regardless.

#### Step 2 — Verify the OTP, get a reset_token

```http
POST /auth/verify-reset-otp
Content-Type: application/json

{ "email": "ada@startup.com", "otp": "391045" }
```

**Response** (`200`):
```json
{
  "status": "success",
  "message": "OK",
  "data": { "reset_token": "eyJhbGciOi..." },
  "error": null
}
```

Hold this `reset_token` in component state (or a query param). Don't put it
in a cookie — it's single-use and lives only for the next API call.

#### Step 3 — Set the new password

```http
POST /auth/reset-password
Content-Type: application/json

{
  "reset_token": "eyJhbGciOi...",
  "new_password": "NewSecurePass1!"
}
```

On success, **all** existing refresh tokens for that user are revoked. The
user must log in fresh. Redirect to `/login`.

### 2.3 Refresh token rotation

When an access_token expires (15 min), the next API call returns
`401 INVALID_TOKEN`. **You should not let users see this**. Intercept the 401
in your API client, call refresh, retry once.

```http
POST /auth/refresh
Content-Type: application/json

{ "refresh_token": "eyJhbGciOi..." }
```

**Response** (`200`):
```jsonc
{
  "status": "success",
  "data": {
    "access_token": "eyJ...new...",
    "refresh_token": "eyJ...new..."   // ← new one — the old is now revoked
  },
  "error": null
}
```

Store both new tokens, replace the cookies, retry the original request.

**Critical security behavior:** if you ever call `/auth/refresh` with a
refresh token that was already used (revoked), the backend interprets that as
**theft** and revokes **all** of that user's refresh tokens. The next
response will be `401 REFRESH_TOKEN_REUSE`. When you see that code: clear
cookies and force a fresh login. Show "For your security, please sign in
again."

Implement refresh inside an interceptor in your `lib/api.ts`:

```ts
// lib/api.ts (refresh interceptor)
async function refreshTokens(): Promise<string | null> {
  const refresh_token = cookies().get("refresh_token")?.value;
  if (!refresh_token) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  const json: ApiResponse<{ access_token: string; refresh_token: string }> = await res.json();
  if (json.status === "error") return null;

  const jar = cookies();
  jar.set("access_token",  json.data!.access_token,  { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 15 });
  jar.set("refresh_token", json.data!.refresh_token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return json.data!.access_token;
}

// Then in api(): on 401, call refreshTokens(), retry once with new token.
```

Skip the interceptor for the `/auth/refresh` call itself (avoid recursion)
and for any call where `skipAuth: true`.

### 2.4 Logout

```http
POST /auth/logout
Authorization: Bearer eyJ...
Content-Type: application/json

{ "refresh_token": "eyJ..." }
```

Then clear all three cookies and redirect to `/login`.

```ts
// app/api/auth/logout/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function POST() {
  const refresh_token = cookies().get("refresh_token")?.value;
  if (refresh_token) {
    await api("/auth/logout", {
      method: "POST",
      body: { refresh_token },
    }).catch(() => {}); // ignore — logout is best-effort
  }
  const jar = cookies();
  jar.delete("access_token");
  jar.delete("refresh_token");
  jar.delete("user_role");
  return NextResponse.json({ ok: true });
}
```

### 2.5 Get current user (`GET /auth/me`)

Use this in a Server Component to populate the navbar avatar / name. It works
for any role.

```http
GET /auth/me
Authorization: Bearer eyJ...
```

**Response:** the same `user` shape as login.

---

## 3. Admin app

There are **three admin sub-roles**: `admin_reviewer`, `admin_lead`, `system_admin`.
Most endpoints accept any of the three. A few are restricted:

| Action                           | Required role                              |
|----------------------------------|--------------------------------------------|
| Login, view dashboard, view queue, triage, score | any admin role               |
| Create / update / delete catalog roles & challenges | `admin_lead`+              |
| Approve / reject employer proposals | `admin_lead`+                            |
| Confirm + deliver shortlist      | `admin_lead`+                              |
| List users, toggle user active   | `system_admin` only                        |
| Create another admin account     | `system_admin` only                        |

If your UI shows a button the current user can't use, you'll get
`403 INSUFFICIENT_ROLE` — use the role from `user_role` cookie to hide
those buttons proactively.

### 3.1 Admin login + dashboard

#### Login

```http
POST /admin/auth/login
Content-Type: application/json

{ "email": "admin@hack51.com", "password": "Admin@Hack51!" }
```

Default seeded credentials are above; force a password change on first login
via the profile page.

#### Dashboard (`GET /admin/dashboard`)

```http
GET /admin/dashboard
Authorization: Bearer eyJ...
```

**Response shape** (this maps directly to the Figma admin dashboard cards
and charts):

```jsonc
{
  "stats": {
    "submissions_received": 245,
    "invalid_submissions": 12,
    "evaluated_submissions": 8,
    "shortlists_delivered": 42
  },
  "users": {
    "total": 387,
    "verified": 350,
    "active": 380,
    "by_role": {
      "candidate": 320, "employer": 60,
      "admin_reviewer": 5, "admin_lead": 1, "system_admin": 1
    }
  },
  "requests": {
    "total": 87,
    "by_status": {
      "draft": 4, "published": 12, "evaluating": 6,
      "shortlisted": 60, "closed": 5
    }
  },
  "payments": { "total_revenue_ngn": 175000000, "total_transactions": 92 },
  "charts": {
    "evaluations_per_day": [
      { "day": "Mon", "count": 3 },
      { "day": "Tue", "count": 7 },
      // ... rest of the week
    ],
    "requests_overview": [
      { "label": "Requests Closed", "value": 5 },
      { "label": "Currently Open",  "value": 12 },
      { "label": "In Evaluation",   "value": 6 },
      { "label": "Shortlisted",     "value": 60 }
    ]
  }
}
```

Render `evaluations_per_day` as a 7-day bar chart. Render `requests_overview`
as the donut from the Figma. Stat cards map to `stats.*`.

### 3.2 Catalog: roles (CRUD)

This is the section where the bug your engineer reported lives. It's now
fixed in v1.1.

#### List roles

```http
GET /admin/catalog/roles
GET /admin/catalog/roles?active=false        # include inactive
GET /admin/catalog/roles?status=pending      # employer-proposed, awaiting review
Authorization: Bearer eyJ...
```

**Response** is an array of roles with their skill_levels, capabilities, and
linked challenges:

```jsonc
[
  {
    "id": "role-uuid-1",
    "name": "Software Engineer",
    "description": "Full-stack engineer",
    "is_active": true,
    "status": "approved",            // 'approved' | 'pending' | 'rejected'
    "proposed_by": null,             // null = admin-created; uuid = employer-proposed
    "created_at": "2026-04-01T...",
    "updated_at": "2026-04-15T...",
    "catalog_skill_levels": [
      { "id": "uuid", "level": "entry-level" },
      { "id": "uuid", "level": "mid-level" },
      { "id": "uuid", "level": "senior" }
    ],
    "catalog_capabilities": [
      { "id": "uuid", "title": "API Design", "summary": "Design RESTful APIs" },
      { "id": "uuid", "title": "Data Modeling", "summary": "Relational and document modeling" }
    ],
    "challenges": [
      { "id": "uuid", "title": "API Optimization Challenge", "is_active": true, "status": "approved" }
    ]
  }
]
```

#### Get one role

```http
GET /admin/catalog/roles/{id}
```

Same shape as above plus `reject_reason` (if it was a rejected proposal) and
each challenge's full `rubric_criteria`.

#### Create role (`admin_lead+`)

```http
POST /admin/catalog/roles
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Software Engineer",
  "description": "Full-stack engineer",
  "skill_levels": ["entry-level", "mid-level", "senior"],
  "capabilities": [
    { "title": "API Design",  "summary": "Design RESTful APIs" },
    { "title": "Data Modeling", "summary": "Relational and document modeling" }
  ]
}
```

**Response** (`201`): the created role with all relations populated.

#### Update role (`admin_lead+`) — **the fixed PUT endpoint**

This is the endpoint your frontend engineer was asking about. The PUT now
accepts the same body shape as POST. Send only the fields you want to change:

```http
PUT /admin/catalog/roles/{id}
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Senior Software Engineer",
  "description": "Updated description",
  "is_active": true,
  "skill_levels": ["mid-level", "senior"],
  "capabilities": [
    { "id": "existing-capability-uuid", "title": "API Design", "summary": "Updated summary" },
    { "title": "System Design", "summary": "New capability — no id, will be inserted" }
  ]
}
```

**Semantics — important to internalize:**

| Field omitted from body | The collection is **untouched** (existing rows kept as-is) |
| Field passed as `[]`    | The collection is **cleared** (all rows deleted) |
| Field passed as `[...]` for `skill_levels` | **Replace-all**: backend deletes all current skill levels and inserts the new set |
| Field passed as `[...]` for `capabilities` | **Diff-sync**: capabilities with an `id` matching an existing row are **updated** (title / summary replaced); those without an `id` are **inserted**; any current capability whose id is not in your payload is **deleted**. |

So if the user opens the edit form, deletes one capability row, edits another,
and adds a new one, your frontend should send the **full current state of the
form** — the capabilities the user wants to keep (with their existing `id`),
the edits (with their `id` + new title/summary), and the new ones (no `id`).
The backend figures out what to delete by absence.

**Response** (`200`): the full updated role with all relations.

#### Delete role (`admin_lead+`)

```http
DELETE /admin/catalog/roles/{id}
Authorization: Bearer eyJ...
```

This **cascades** — all challenges under this role are deleted too, plus
their rubric criteria, plus any submissions referencing those challenges.
Show a confirmation modal that says exactly that.

### 3.3 Catalog: challenges (CRUD)

#### List challenges

```http
GET /admin/catalog/challenges
GET /admin/catalog/challenges?active=false
GET /admin/catalog/challenges?status=pending      # employer proposals
```

**Response** array entries:

```jsonc
{
  "id": "uuid",
  "title": "API Optimization Challenge",
  "summary": "Improve a sluggish REST API",
  "is_active": true,
  "status": "approved",
  "proposed_by": null,
  "created_at": "...",
  "catalog_roles": { "id": "role-uuid", "name": "Software Engineer" },
  "rubric_criteria": [
    { "id": "uuid", "title": "Code Quality",       "weight": 30 },
    { "id": "uuid", "title": "Code Technicality",  "weight": 30 },
    { "id": "uuid", "title": "Code Functionality", "weight": 40 }
  ]
}
```

#### Get one challenge

```http
GET /admin/catalog/challenges/{id}
```

Returns full challenge detail including `scenario`, `deliverables`,
`submission_format`, `constraints_text`, `submission_requirements`, and
`rubric_criteria` with full descriptions.

#### Create challenge (`admin_lead+`)

```http
POST /admin/catalog/challenges
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "catalog_role_id": "role-uuid",
  "title": "API Optimization Challenge",
  "summary": "Improve a sluggish REST API",
  "scenario": "Your team manages a backend API with 2-second p95 latency...",
  "deliverables": ["Source code repo", "README.md", "Performance report"],
  "submission_format": "Single ZIP or public GitHub link",
  "constraints_text": "Max 10 pages. No external libraries beyond requirements.",
  "submission_requirements": "Provide a public GitHub repo with a README.",
  "rubric_criteria": [
    { "title": "Code Quality",       "description": "Patterns, readability",     "weight": 30 },
    { "title": "Code Technicality",  "description": "Architecture decisions",     "weight": 30 },
    { "title": "Code Functionality", "description": "Correct + efficient",       "weight": 40 }
  ]
}
```

**Validation rule:** `rubric_criteria` weights must sum to **exactly 100**.
Otherwise you get `422 VALIDATION_ERROR` with a clear message. Show this
inline in the rubric builder UI as a live total ("Total: 100% ✓" or
"Total: 95% — must equal 100%").

#### Update challenge (`admin_lead+`)

```http
PUT /admin/catalog/challenges/{id}
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "title": "Updated Title",
  "is_active": true,
  "rubric_criteria": [
    { "id": "existing-uuid", "title": "Code Quality", "description": "Updated", "weight": 40 },
    { "title": "New Criterion", "description": "Newly added", "weight": 60 }
  ]
}
```

**Rubric semantics here are simpler than capabilities** — passing
`rubric_criteria` is **replace-all** (delete current rubric + insert new set,
with weights summing to 100). This is intentional: rubric IDs are snapshotted
into job_requests at publish time, so there's nothing long-term that depends
on a specific rubric criterion id surviving an update.

Omit `rubric_criteria` from the body to leave the rubric untouched.

#### Delete challenge (`admin_lead+`)

```http
DELETE /admin/catalog/challenges/{id}
```

Cascades to rubric_criteria and any submissions.

### 3.4 Catalog: proposal review queue

When an employer proposes a custom role or challenge (see §4.5), it lands in
this admin queue with `status: "pending"`.

#### List pending role proposals

```http
GET /admin/catalog/proposals/roles
Authorization: Bearer eyJ...
```

**Response** — pending roles + the proposing employer's contact info:

```jsonc
[
  {
    "id": "role-uuid",
    "name": "Growth Marketing Lead",
    "description": "Drives growth strategy and experimentation",
    "status": "pending",
    "proposed_by": "employer-uuid",
    "created_at": "2026-04-20T...",
    "catalog_skill_levels": [{ "id": "uuid", "level": "senior" }],
    "catalog_capabilities": [
      { "id": "uuid", "title": "Experiment Design", "summary": "..." }
    ],
    "users": {
      "id": "employer-uuid",
      "email": "cto@startup.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }
]
```

#### Approve / reject a role proposal (`admin_lead+`)

```http
POST /admin/catalog/proposals/roles/{id}/review
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "decision": "approve",                              // or "reject"
  "reason": "Required when rejecting; optional when approving"
}
```

On `approve` → the role's `status` flips to `"approved"` and it immediately
appears in the public catalog. The proposing employer gets an in-app
notification ("Your proposed role was approved").

On `reject` → `status` flips to `"rejected"`, `reject_reason` is stored, and
`is_active` is set to `false`. The proposer gets a notification with the
reason. The role stays in the DB so the employer can see why it was rejected
and propose a refined version.

#### List pending challenge proposals

```http
GET /admin/catalog/proposals/challenges
```

Same shape as roles but with the challenge fields and the parent
`catalog_roles` info (to confirm the role exists / is approved).

#### Approve / reject a challenge proposal

```http
POST /admin/catalog/proposals/challenges/{id}/review
Authorization: Bearer eyJ...

{ "decision": "approve" }
```

### 3.5 Review pipeline: queue → triage → score → shortlist → deliver

This is the admin's day-to-day. The flow is:

```
Published request  →  candidates submit  →  admin triages each submission
                                              │
                                              ├─ valid     → goes to scoring queue
                                              ├─ returned  → candidate can resubmit
                                              └─ invalid   → rejected, no resubmit
                                                                 │
Scored submissions  ←  admin scores against locked rubric  ←─────┘
        │
        ├──→ admin_lead picks Top N → confirm → deliver → settlement record created → employer notified
```

#### Step 1 — The request queue

```http
GET /admin/review/requests
GET /admin/review/requests?status=published
```

Lists all non-draft requests with employer + workspace info.

#### Step 2 — Submissions for a request

```http
GET /admin/review/requests/{requestId}/submissions
```

**Response:**

```jsonc
{
  "stats": {
    "total": 21, "submitted": 8, "under_review": 6, "returned": 2,
    "scored": 4, "shortlisted": 1, "rejected": 0
  },
  "submissions": [
    {
      "id": "submission-uuid",
      "status": "submitted",
      "artifact_urls": ["https://github.com/user/repo"],
      "artifact_type": "link",
      "submission_statement": "...",
      "triage_decision": null,
      "triage_reason": null,
      "reviewer_notes": null,
      "total_score": null,
      "submitted_at": "2026-04-20T...",
      "users": {
        "id": "candidate-uuid", "email": "ada@example.com",
        "first_name": "Ada", "last_name": "Lovelace", "avatar_url": null
      }
    }
  ]
}
```

#### Step 3 — Get a single submission detail

```http
GET /admin/review/submissions/{id}
```

Includes the **rubric snapshot** (locked at publish time — this is what you
score against), the candidate info, all artifact URLs, the integrity
declaration, and any existing scores.

#### Step 4 — Triage

The triage step is binary-ish: is this submission worth scoring at all?

```http
POST /admin/review/submissions/{id}/triage
Authorization: Bearer eyJ...

{
  "decision": "valid",                       // "valid" | "invalid" | "returned"
  "reason": "All deliverables present; format correct."
}
```

**Status transitions:**
- `valid`    → submission status becomes `under_review`; goes to scoring queue
- `invalid`  → submission status becomes `rejected`; no resubmit allowed
- `returned` → submission status becomes `returned`; candidate sees the
  reason and can resubmit (one allowed)

The candidate gets an in-app notification automatically.

#### Step 5 — Score

After triage = valid, the admin (any reviewer) scores against the locked
rubric. Each rubric criterion gets a 0–100 percentage. The backend computes
`total_score = sum(weight × score_percent / 100)`.

```http
POST /admin/review/submissions/{id}/score
Authorization: Bearer eyJ...

{
  "scores": [
    { "criterion_id": "uuid1", "criterion_title": "Code Quality",       "weight": 30, "score_percent": 85 },
    { "criterion_id": "uuid2", "criterion_title": "Code Technicality",  "weight": 30, "score_percent": 90 },
    { "criterion_id": "uuid3", "criterion_title": "Code Functionality", "weight": 40, "score_percent": 80 }
  ],
  "reviewer_notes": "Strong technical proficiency. Clean architecture choices."
}
```

After this, submission status is `scored`. The total in the example above is
`(30×85 + 30×90 + 40×80) / 100 = 84.5`.

#### Step 6 — Shortlist queue

Once submissions are scored, an `admin_lead` picks the Top N candidates.

```http
GET /admin/review/shortlists                              # all jobs ready for shortlisting
GET /admin/review/shortlists/{requestId}/candidates       # ranked by total_score
```

The candidates endpoint returns scored submissions sorted by `total_score`
DESC with full score breakdowns:

```jsonc
[
  {
    "id": "submission-uuid",
    "total_score": 92.5,
    "status": "scored",
    "submitted_at": "...",
    "scored_at": "...",
    "users": { "id": "uuid", "email": "...", "first_name": "...", "last_name": "..." },
    "submission_scores": [
      { "criterion_id": "uuid", "criterion_title": "Code Quality",       "weight": 30, "score_percent": 90 },
      { "criterion_id": "uuid", "criterion_title": "Code Technicality",  "weight": 30, "score_percent": 95 },
      { "criterion_id": "uuid", "criterion_title": "Code Functionality", "weight": 40, "score_percent": 92 }
    ]
  },
  // ...
]
```

#### Step 7 — Confirm shortlist (`admin_lead+`)

The admin picks N candidates and assigns ranks 1 through N.

```http
POST /admin/review/shortlists/{requestId}/confirm
Authorization: Bearer eyJ...

{
  "selections": [
    { "candidate_id": "uuid-1", "submission_id": "sub-uuid-1", "rank": 1 },
    { "candidate_id": "uuid-2", "submission_id": "sub-uuid-2", "rank": 2 },
    { "candidate_id": "uuid-3", "submission_id": "sub-uuid-3", "rank": 3 }
  ]
}
```

Marks those submissions as `shortlisted`. The shortlist entries are created
but **not yet delivered** — admin can re-confirm to swap candidates.

#### Step 8 — Deliver shortlist (`admin_lead+`)

```http
POST /admin/review/shortlists/{requestId}/deliver
Authorization: Bearer eyJ...
```

This is the final hand-off. It:
1. Marks all shortlist rows as `delivered_at: <now>`.
2. Flips request status to `shortlisted`.
3. Computes settlement: `final_charge = admin_fee + scored_count × ₦180k`.
4. Computes `credit_returned = max(0, deposit_amount - final_charge)`.
5. Creates a settlement record.
6. Sends the employer an in-app notification with the numbers.

**Response:**
```jsonc
{
  "request": { /* full job_request row */ },
  "final_charge": 1980000,
  "credit_returned": 600000
}
```

### 3.6 Wallet, users management, notifications

#### Wallet (`GET /admin/wallet?filter=...`)

`filter` is one of `oldest | latest | successful | failed` (default: latest).

```jsonc
{
  "totalRevenue": 175000000,         // sum of all settlement final_charges
  "totalDeposits": 220000000,        // sum of successful payments
  "totalCreditReturned": 45000000,
  "settlements": [ /* settlement_records array */ ],
  "payments":    [ /* payments array */ ],
  "transactions": [
    {
      "id": "uuid", "amount": 4580000, "status": "success",
      "payment_reference": "H51-1729...", "payment_type": "deposit",
      "created_at": "...", "paid_at": "...",
      "users": { "email": "cto@startup.com", "first_name": "John", "last_name": "Doe" },
      "job_requests": { "id": "uuid", "title": "Senior Product Designer" }
    }
  ]
}
```

#### Users management (`system_admin` only)

```http
GET /admin/users?role=candidate&search=ada
PATCH /admin/users/{userId}/toggle-active
```

#### Create another admin (`system_admin` only)

```http
POST /admin/auth/create
Authorization: Bearer eyJ...

{
  "email": "newreviewer@hack51.com",
  "password": "SecurePass1!",
  "role": "admin_reviewer",      // or "admin_lead"
  "first_name": "Jane"
}
```

The backend creates a **pre-verified** admin account and emails the new
admin a one-time password reset OTP so they can set their own password on
first login. The password you sent is stored but should be considered a
placeholder — the OTP flow overrides it.

#### Notifications (any admin)

```http
GET /admin/notifications
GET /admin/notifications?unread=true&limit=20
POST /admin/notifications/mark-read    body: { "ids": ["uuid"] }   # or omit ids to mark all
```

---

## 4. Employer app

The employer's job is to publish a hiring **request**, pay the deposit, then
wait for the admin team to deliver a Top N shortlist. Employers **never see
individual submissions** during evaluation — that's a deliberate signal-
integrity rule from the Concept Note.

### 4.1 Employer signup + workspace

#### Signup

Use `POST /employer/auth/register` (or `/auth/register` with `role: "employer"`).
See §2.1 for the full flow. After email verification, a **blank workspace
row** is auto-created in the DB.

#### Get workspace

```http
GET /employer/workspace
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
{
  "id": "workspace-uuid",
  "owner_id": "user-uuid",
  "company_name": null,        // empty until they fill it in
  "company_url":  null,
  "industry":     null,
  "team_size":    null,
  "logo_url":     null,
  "description":  null,
  "created_at": "...",
  "updated_at": "..."
}
```

If `company_name` is null, **redirect the user to a "complete your workspace"
onboarding page** before letting them into the dashboard. The wizard requires
a workspace.

#### Update workspace

```http
PATCH /employer/workspace
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "company_name": "Acme Corp",
  "company_url":  "https://acme.com",
  "industry":     "Technology",
  "team_size":    "11-50"          // enum: "1-10" | "11-50" | "51-200" | "201-500" | "500+"
}
```

#### Update employer profile (name / avatar / password)

```http
PATCH /employer/profile
Authorization: Bearer eyJ...

{
  "first_name": "John",
  "avatar_url": "https://...",
  "old_password": "SecurePass1!",   // required only if changing password
  "new_password": "NewSecure1!"
}
```

### 4.2 Dashboard

```http
GET /employer/dashboard
Authorization: Bearer eyJ...
```

**Response** — maps directly to the Figma "DashBoard" screen:

```jsonc
{
  "summary": {
    "total_requests": 12,
    "total_submissions": 245,
    "total_evaluations": 8,
    "total_shortlists_delivered": 42,
    "unread_notifications": 3,
    "by_status": { "draft": 2, "published": 5, "shortlisted": 5 }
  },
  "active_requests": [
    {
      "id": "uuid", "title": "Senior Product Designer",
      "status": "published", "challenge_cap": 21, "shortlist_size": 5,
      "deadline": "2026-06-01T00:00:00Z", "published_at": "...", "created_at": "..."
    }
  ],
  "recent_requests": [ /* up to 5 most recent */ ]
}
```

Stat cards:
- "Total Requests" — `summary.total_requests`
- "Total Submissions" — `summary.total_submissions`
- "Total Evaluations" — `summary.total_evaluations` ("pending review" subline)
- "Total Shortlists Delivered" — `summary.total_shortlists_delivered`

The "Active Requests" table on the dashboard maps to `active_requests`. Each
row's progress bar is `submissions_received / challenge_cap` — see §4.3
for how to fetch per-request submission counts.

### 4.3 Hiring wizard (the main flow)

The wizard collects:

1. **Role** — pick from approved catalog OR propose a new one (§4.5)
2. **Skill level** — entry-level / mid-level / senior
3. **Challenge** — pick from the role's approved challenges OR propose new
4. **(Optional) Customize rubric** — override the challenge's default rubric
   for this request only (§4.4)
5. **Cap + shortlist size + deadline**
6. **Review + publish** — locks rubric snapshot, redirects to Paystack

#### Step 1 — Browse catalog roles

```http
GET /employer/catalog/roles
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
{
  "approved": [
    {
      "id": "uuid", "name": "Software Engineer", "description": "...",
      "is_active": true, "status": "approved",
      "catalog_skill_levels": [{ "id": "uuid", "level": "senior" }, ...],
      "catalog_capabilities": [{ "id": "uuid", "title": "API Design", "summary": "..." }, ...],
      "challenges": [{ "id": "uuid", "title": "...", "is_active": true, "status": "approved" }]
    }
  ],
  "my_proposals": [
    // roles this employer has proposed — pending or rejected — so they can see status
    { "id": "uuid", "name": "Growth Lead", "status": "pending", ... }
  ]
}
```

The wizard's role picker should show `approved` as the main grid and have a
secondary section "Your proposals" for `my_proposals`. Pending proposals
show a badge like "Awaiting admin review", rejected ones show
`reject_reason` from `GET /employer/catalog/roles` if expanded.

#### Step 2 — Browse challenges for the chosen role

```http
GET /employer/catalog/challenges?role_id={role-uuid}
Authorization: Bearer eyJ...
```

**Response:** same `{ approved, my_proposals }` shape as roles, scoped to
challenges under that `role_id`.

#### Step 3 — Get a challenge's full detail (for rubric preview)

```http
GET /employer/catalog/challenges/{id}
Authorization: Bearer eyJ...
```

Returns the full challenge with the **default rubric**. Show this on a
"Review challenge" screen before the employer commits.

```jsonc
{
  "id": "uuid",
  "title": "API Optimization Challenge",
  "summary": "...",
  "scenario": "Your team manages...",
  "deliverables": ["Source code", "README", "Performance report"],
  "submission_format": "...",
  "constraints_text": "...",
  "submission_requirements": "...",
  "is_active": true, "status": "approved",
  "catalog_roles": { "id": "uuid", "name": "Software Engineer" },
  "rubric_criteria": [
    { "id": "uuid", "title": "Code Quality",       "description": "...", "weight": 30, "sort_order": 0 },
    { "id": "uuid", "title": "Code Technicality",  "description": "...", "weight": 30, "sort_order": 1 },
    { "id": "uuid", "title": "Code Functionality", "description": "...", "weight": 40, "sort_order": 2 }
  ]
}
```

#### Step 4 — Create the draft request

```http
POST /employer/requests
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "title": "Senior Product Designer",
  "role_type": "Product Designer",                 // free text label shown in lists
  "role_level": "senior",                          // "entry-level" | "mid-level" | "senior"
  "challenge_id": "challenge-uuid",                // from catalog
  "challenge_cap": 21,                             // max accepted submissions
  "shortlist_size": 5,                             // Top N to deliver
  "deadline": "2026-06-01T00:00:00Z"               // ISO 8601 with timezone
}
```

**Response** (`201`):
```jsonc
{
  "id": "request-uuid",
  "workspace_id": "uuid",
  "employer_id": "uuid",
  "challenge_id": "challenge-uuid",
  "title": "Senior Product Designer",
  "role_type": "Product Designer",
  "role_level": "senior",
  "status": "draft",
  "challenge_cap": 21,
  "shortlist_size": 5,
  "deadline": "2026-06-01T00:00:00Z",
  "admin_fee": 800000,                  // ₦800,000 fixed
  "deposit_amount": 4580000,            // ₦800k + 21 × ₦180k = ₦4,580,000
  "final_charge": null,                 // computed at delivery
  "custom_rubric": null,                // see §4.4
  "snapshot_challenge": null,           // populated on publish
  "snapshot_rubric": null,              // populated on publish
  "published_at": null, "closed_at": null,
  "created_at": "...", "updated_at": "..."
}
```

**Pricing** (you should also display this client-side as the cap input
changes — the formula is fixed in the backend so duplicating it is safe):
```
deposit = ₦800,000 (admin fee)  +  cap × ₦180,000 (per-submission unit price)
```

Show this as a live preview on the wizard form so the employer knows what
they'll pay before committing.

#### Step 5 — List / get / update drafts

```http
GET /employer/requests                       # all (any status)
GET /employer/requests?drafts=true           # drafts only
GET /employer/requests?status=published      # by status
GET /employer/requests/{id}                  # single, with submission_stats
PATCH /employer/requests/{id}                # update fields (only while draft)
DELETE /employer/requests/{id}               # close
```

`GET /employer/requests/{id}` returns the request **plus** live
`submission_stats`:

```jsonc
{
  "id": "uuid",
  // ... all the fields from create response, plus:
  "challenges": { /* full challenge with rubric */ },
  "workspaces": { "id": "uuid", "company_name": "Acme Corp" },
  "submission_stats": {
    "total": 12, "submitted": 4, "under_review": 3, "returned": 1,
    "scored": 2, "shortlisted": 0, "rejected": 2
  }
}
```

The "Active Request View" Figma screen renders directly from this:
- Submission Cap = `challenge_cap`
- Accepted Submissions = `submission_stats.total` (with `(N%)` = total/cap)
- Target Shortlist = `shortlist_size`
- Admin Setup Fee = `admin_fee` (always ₦800,000)
- Prepaid Deposit = `deposit_amount`
- Final Charge to Date = `final_charge` (or sum-so-far if you compute it
  client-side from `submission_stats.scored × ₦180k + admin_fee` while
  delivery is pending)
- Activity timeline = derive from request status + dates

#### Update draft

```http
PATCH /employer/requests/{id}
Authorization: Bearer eyJ...

{
  "challenge_cap": 30,        // changing cap auto-recalculates deposit_amount
  "shortlist_size": 7,
  "deadline": "2026-07-01T00:00:00Z",
  "custom_rubric": [ /* see §4.4 */ ]
}
```

You can only PATCH while `status === "draft"`. Trying to PATCH a published
request returns `404 REQUEST_NOT_FOUND` (the WHERE clause filters by status).

### 4.4 Custom rubric per request

The Concept Note explicitly says employers must be able to "customize the
challenge brief and rubric before publishing." Send `custom_rubric` on the
request to override the challenge's default rubric for **this request only**.
The catalog challenge stays untouched.

```jsonc
POST /employer/requests
Authorization: Bearer eyJ...

{
  "title": "Senior Product Designer",
  "challenge_id": "uuid",
  "challenge_cap": 21,
  "custom_rubric": [
    { "title": "Visual Design",       "description": "Aesthetics and polish",          "weight": 30 },
    { "title": "UX Reasoning",        "description": "Logic and information flow",      "weight": 40 },
    { "title": "Prototype Quality",   "description": "Technical execution",            "weight": 30 }
  ]
}
```

Rules:
- Weights must sum to **exactly 100** (validated at request time and again
  at publish time).
- Omit `custom_rubric` to use the challenge's default rubric.
- Pass `[]` to clear any existing custom rubric (revert to default).
- The rubric snapshot at publish time uses `custom_rubric` if set, otherwise
  the default. Either way, the snapshot is **locked** — admin reviewers
  score against exactly what was on the request when it was published, even
  if the catalog challenge's default rubric is later edited.

UI suggestion: show the challenge's default rubric pre-filled. If the user
edits any criterion, switch to "custom" mode and submit `custom_rubric`.
Show a live "Total: 100% ✓" indicator.

### 4.5 Propose a custom role / challenge (catalog-miss path)

This is the second half of what your engineer asked about. When the employer
can't find what they need in the admin catalog, they propose their own. It
goes to the admin queue (§3.4) for approval before it becomes available to
other employers.

**The proposing employer can use their own pending proposals immediately** —
they show up under `my_proposals` in `/employer/catalog/*` and can be
referenced when building a request, even before admin approval. (When they
publish that request, the proposed role/challenge gets approved alongside.)

> **Product decision call-out:** the backend currently allows an employer to
> attach a request to a pending proposed challenge of their own. If you want
> stricter behavior — "must be admin-approved before you can publish a
> request against it" — flag this and we'll add a check in the publish path.

#### Propose a role

```http
POST /employer/catalog/propose/role
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "name": "Growth Marketing Lead",
  "description": "Drives growth strategy and experimentation",
  "skill_levels": ["mid-level", "senior"],
  "capabilities": [
    { "title": "Experiment Design", "summary": "A/B testing, funnel analysis" },
    { "title": "SEO Strategy",      "summary": "Technical and content SEO" }
  ]
}
```

**Response** (`201`): the proposed role with `status: "pending"`,
`proposed_by: <employer-uuid>`. Show a confirmation: "Submitted — admin will
review and notify you."

#### Propose a challenge

```http
POST /employer/catalog/propose/challenge
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "catalog_role_id": "role-uuid",          // approved or your own pending role
  "title": "Growth Funnel Audit Challenge",
  "summary": "Audit a sample funnel and propose improvements",
  "scenario": "You've been hired as a consultant for...",
  "deliverables": ["Audit report", "Prioritized recommendations", "Dashboard mockup"],
  "submission_format": "Google Docs link + Figma link",
  "submission_requirements": "Public links, view access for hack51@",
  "rubric_criteria": [
    { "title": "Diagnostic Quality",   "description": "Depth of funnel analysis",  "weight": 40 },
    { "title": "Recommendation Rigor", "description": "Actionable + prioritized",  "weight": 35 },
    { "title": "Presentation",         "description": "Clarity and visuals",       "weight": 25 }
  ]
}
```

**Validation:** rubric weights must sum to 100. If `catalog_role_id` is
someone else's pending role, you get `403 ROLE_NOT_OWNED`. If it's a
rejected role, you get `403 ROLE_REJECTED`.

When the admin reviews via §3.4, the employer gets a notification.

#### Handling notifications about your proposals

Watch for notification metadata:
```jsonc
{
  "id": "...", "title": "Your proposed role was approved",
  "body": "\"Growth Lead\" is now available in the public catalog.",
  "type": "success",
  "metadata": { "role_id": "uuid" }
}
```

Use `metadata.role_id` to deep-link the user back to that role in their
catalog browse.

### 4.6 Publish + Paystack handoff

```http
POST /employer/requests/{id}/publish
Authorization: Bearer eyJ...
```

This single call:
1. Validates `challenge_id` is set (else `400 NO_CHALLENGE`).
2. Validates `custom_rubric` weights sum to 100 if present.
3. Locks `snapshot_challenge` (the challenge JSON) and `snapshot_rubric`
   (custom_rubric if set, else challenge's rubric).
4. Sets request status to `published`.
5. Initiates a Paystack payment for `deposit_amount`.

**Response:**
```jsonc
{
  "request": { /* full request, now status:'published' */ },
  "payment": {
    "payment_reference": "H51-1729...",
    "authorization_url": "https://checkout.paystack.com/0abcxyz...",
    "access_code": "..."
  }
}
```

**Frontend action:** `window.location = payment.authorization_url`. Paystack
hosts the checkout. After the user pays (or cancels), Paystack redirects
them to a `callback_url` you configured in your Paystack dashboard
settings.

#### Verify after Paystack redirect

Set Paystack's callback to something like
`https://yourapp.com/employer/payments/callback?reference={reference}`.
On that page, call:

```http
GET /employer/payments/verify/{reference}
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
{
  "reference": "H51-1729...",
  "status": "success",     // or "failed"
  "amount": 4580000,
  "currency": "NGN"
}
```

> **Note**: the Paystack integration is currently **stubbed** — the backend
> has the full code path in place but `PAYSTACK_SECRET_KEY` is not yet
> configured, so `authorization_url` returns a placeholder URL and verify
> always reports success. When the backend team flips the switch
> (uncomment 4 lines + add the env var) the same endpoints will work for
> real. Build your UI against the documented contract, not the stub.

#### Webhook (Paystack-only — not your concern)

`POST /payments/webhook` is called by Paystack directly. You don't call it.
It updates payment statuses asynchronously.

#### Standalone payment initiation (for top-ups, etc.)

```http
POST /employer/payments/initiate
Authorization: Bearer eyJ...

{
  "amount_ngn": 4580000,
  "job_request_id": "uuid",       // optional
  "payment_type": "deposit",      // optional, default "deposit"
  "metadata": { "anything": "..." }
}
```

#### Payment history

```http
GET /employer/payments/history
Authorization: Bearer eyJ...
```

Returns all of this employer's payments, newest first.

### 4.7 Shortlists + billing

#### List delivered shortlists

```http
GET /employer/shortlists
Authorization: Bearer eyJ...
```

Returns all requests with `status: "shortlisted"` (i.e. the admin team has
finished and delivered). Each entry contains the full evidence pack for the
Top N.

#### Single shortlist (the evidence pack)

```http
GET /employer/shortlists/{requestId}
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
{
  "id": "request-uuid",
  "title": "Senior Product Designer",
  "role_type": "Product Designer",
  "role_level": "senior",
  "shortlist_size": 5,
  "status": "shortlisted",
  "deposit_amount": 4580000,
  "final_charge": 1980000,
  "published_at": "...",
  "shortlists": [
    {
      "id": "shortlist-uuid",
      "rank": 1,
      "total_score": 92.5,
      "confirmed_at": "...",
      "delivered_at": "...",
      "users": {
        "id": "candidate-uuid", "email": "ada@example.com",
        "first_name": "Ada", "last_name": "Lovelace",
        "avatar_url": "..."
      },
      "submissions": {
        "id": "submission-uuid",
        "artifact_urls": ["https://github.com/ada/api-challenge"],
        "submission_statement": "...",
        "reviewer_notes": "Strong technical proficiency.",
        "total_score": 92.5,
        "submission_scores": [
          { "criterion_title": "Code Quality",      "weight": 30, "score_percent": 90 },
          { "criterion_title": "Code Technicality", "weight": 30, "score_percent": 95 },
          { "criterion_title": "Code Functionality","weight": 40, "score_percent": 92 }
        ]
      }
    }
    // ... ranks 2 through N
  ]
}
```

This is the **decision-ready evidence pack** described in the Concept Note.
Render each shortlisted candidate as a card with their score breakdown,
artifact links, contact info, and reviewer notes.

#### Billing

```http
GET /employer/billing
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
{
  "summary": {
    "total_spent": 1980000,        // sum of final_charges across all settled requests
    "total_credit": 600000          // sum of credit_returned (unused deposit)
  },
  "requests": [
    { "id": "uuid", "title": "Senior Product Designer", "status": "shortlisted",
      "deposit_amount": 4580000, "final_charge": 1980000 }
  ],
  "settlements": [
    { "id": "uuid", "job_request_id": "uuid", "deposit_paid": 4580000,
      "final_charge": 1980000, "credit_returned": 2600000, "settled_at": "..." }
  ],
  "payments": [ /* all employer payment records */ ]
}
```

#### Notifications (employer)

```http
GET /employer/notifications
GET /employer/notifications?unread=true
POST /employer/notifications/mark-read    body: { "ids": ["uuid"] }   # or omit to mark all
```

Notifications you'll receive: shortlist delivered, custom proposal approved/
rejected, payment confirmation (when Paystack is live), etc.

---

## 5. Candidate app

Candidates browse open challenges (no auth needed for browsing), submit
artifacts, and track their submissions.

### 5.1 Public challenge browsing (no auth)

**These endpoints don't require an `Authorization` header.** Set
`skipAuth: true` in your API client.

```http
GET /candidate/challenges
GET /candidate/challenges?search=designer
```

**Response** — array of published `job_requests` enriched with the
challenge detail and the hiring company info:

```jsonc
[
  {
    "id": "request-uuid",
    "title": "Senior Product Designer",
    "role_type": "Product Designer",
    "role_level": "senior",
    "challenge_cap": 21,
    "shortlist_size": 5,
    "deadline": "2026-06-01T00:00:00Z",
    "published_at": "...",
    "created_at": "...",
    "challenges": {
      "id": "uuid", "title": "Design Audit Challenge", "summary": "...",
      "scenario": "...", "deliverables": [...],
      "submission_format": "...", "constraints_text": "...",
      "rubric_criteria": [{ "title": "Visual Design", "weight": 30 }, ...]
    },
    "workspaces": {
      "company_name": "Acme Corp", "industry": "Technology",
      "logo_url": "..."
    }
  }
]
```

#### Single challenge detail (public)

```http
GET /candidate/challenges/{id}
```

Same shape, plus `snapshot_challenge`, `snapshot_rubric`, and the workspace's
`description`. **Use the snapshot fields** for the detail page — they're
the locked version that won't change while the challenge is open.

### 5.2 Signup + profile

Standard signup via `POST /candidate/auth/register` (see §2.1). After
verification, an empty profile row is auto-created.

#### Get profile

```http
GET /candidate/profile
Authorization: Bearer eyJ...
```

```jsonc
{
  "id": "uuid", "user_id": "uuid",
  "bio": null, "skills": [], "experience_years": null,
  "location": null, "linkedin_url": null, "portfolio_url": null,
  "is_available": true, "updated_at": "..."
}
```

#### Update profile

```http
PATCH /candidate/profile
Authorization: Bearer eyJ...

{
  "bio": "Full-stack developer, 5 years experience",
  "skills": ["TypeScript", "React", "Node.js"],
  "experience_years": 5,
  "location": "Lagos, Nigeria",
  "linkedin_url": "https://linkedin.com/in/ada",
  "portfolio_url": "https://ada.dev"
}
```

#### Update account settings (name / avatar / password)

```http
PATCH /candidate/settings
Authorization: Bearer eyJ...

{
  "first_name": "Ada",
  "old_password": "SecurePass1!",
  "new_password": "NewSecure1!"
}
```

### 5.3 Submit + track + resubmit

#### Submit to a challenge

The candidate must be authenticated (anonymous browsing only — no anonymous
submitting).

```http
POST /candidate/challenges/{requestId}/submit
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "artifact_urls": ["https://github.com/ada/api-challenge"],
  "artifact_type": "link",                    // "link" | "upload" | "both"
  "submission_statement": "AI was used only for brainstorming. All work is my own.",
  "integrity_declared": true                  // MUST be true — backend rejects false
}
```

**Validation:**
- `artifact_urls` — 1 to 10 URLs, each must be a valid URL
- `integrity_declared` — must be the literal `true` (not "true" string)

**Response** (`201`): the created submission.

**Possible errors:**
| Code              | When                                 |
|-------------------|--------------------------------------|
| `CHALLENGE_CLOSED`| Request status not `published`        |
| `DEADLINE_PASSED` | `deadline` is in the past             |
| `ALREADY_SUBMITTED`| Candidate already submitted (resubmit only allowed if previous was `returned`) |

**Resubmit path:** if the candidate's previous submission was returned by
triage, the same endpoint works again — the backend detects the existing
`returned` row and updates it in place, incrementing `resubmit_count`.

#### List my submissions

```http
GET /candidate/submissions
Authorization: Bearer eyJ...
```

**Response:**
```jsonc
[
  {
    "id": "submission-uuid",
    "status": "scored",
    "artifact_urls": ["https://github.com/ada/api-challenge"],
    "submission_statement": "...",
    "triage_decision": "valid",
    "triage_reason": null,
    "reviewer_notes": "Strong technical proficiency.",
    "total_score": 92.5,
    "resubmit_count": 0,
    "submitted_at": "...",
    "updated_at": "...",
    "job_requests": {
      "id": "uuid", "title": "Senior Product Designer",
      "role_type": "Product Designer", "role_level": "senior",
      "deadline": "2026-06-01T00:00:00Z",
      "workspaces": { "company_name": "Acme Corp" }
    }
  }
]
```

#### Get one of my submissions

```http
GET /candidate/submissions/{id}
Authorization: Bearer eyJ...
```

Returns the full submission with score breakdown and the `job_requests`
context. The backend enforces ownership — you'll get `403 FORBIDDEN` if you
try to read someone else's submission ID.

#### Candidate dashboard

```http
GET /candidate/dashboard
Authorization: Bearer eyJ...
```

```jsonc
{
  "summary": {
    "total_submissions": 7,
    "total_shortlisted": 2,
    "unread_notifications": 1,
    "by_status": { "submitted": 1, "scored": 2, "shortlisted": 2, "rejected": 1, "returned": 1 }
  },
  "recent_submissions": [ /* up to 5 most recent */ ],
  "shortlists": [
    {
      "id": "uuid", "rank": 1, "total_score": 92.5, "confirmed_at": "...",
      "job_requests": { "title": "Senior Product Designer", "role_type": "Product Designer" }
    }
  ],
  "profile": {
    "skills": ["TypeScript", "React"],
    "experience_years": 5,
    "location": "Lagos, Nigeria"
  }
}
```

#### Notifications (candidate)

```http
GET /candidate/notifications
GET /candidate/notifications?unread=true
POST /candidate/notifications/mark-read    body: { "ids": ["uuid"] }   # or omit to mark all
```

You'll receive notifications for: submission triaged (valid/invalid/returned),
submission scored, shortlist delivery (if the employer's request reaches you).

---

## 6. State machines + status reference

### 6.1 `job_requests.status`

```
   ┌─────────┐  publish + payment   ┌────────────┐
   │  draft  │ ───────────────────▶ │ published  │
   └─────────┘                      └────────────┘
        │                                │
        │ DELETE /requests/{id}          │  candidates submit
        ▼                                ▼
   ┌─────────┐                     ┌────────────┐
   │ closed  │                     │ evaluating │  (admin starts triaging)
   └─────────┘                     └────────────┘
                                         │
                                         │  shortlist confirmed + delivered
                                         ▼
                                   ┌─────────────┐
                                   │ shortlisted │  (terminal — evidence pack delivered)
                                   └─────────────┘
```

Notes:
- `evaluating` is a derived state — the backend sets it when admin work
  begins. It's safe to render `published` and `evaluating` as the same UI
  state ("In progress") if you want.
- A request can be `closed` from any state by the employer (DELETE).

### 6.2 `submissions.status`

```
                          ┌─────────────────────────────┐
                          │  submission_status_enum     │
                          │                             │
  candidate submits  ──▶  │  submitted                  │
                          │       │                     │
                          │       │  admin triages      │
                          │       ├──▶ rejected         │ (was 'invalid')
                          │       ├──▶ returned ──┐     │ (candidate can resubmit)
                          │       │               │     │
                          │       └──▶ under_review     │ (was 'valid')
                          │                  │          │
                          │                  │ admin scores
                          │                  ▼          │
                          │              scored         │
                          │                  │          │
                          │                  │ admin_lead picks Top N + delivers
                          │                  ▼          │
                          │            shortlisted      │
                          └─────────────────────────────┘

  resubmit path:  returned ─────(candidate POST /submit again)─────▶ submitted
```

### 6.3 `payments.status` and `proposal_status`

```
payments.status:   pending → success | failed | refunded
proposal_status:   approved | pending | rejected
```

### 6.4 Money — what gets charged when

| Event              | Money movement                                        |
|--------------------|-------------------------------------------------------|
| Publish request    | Employer charged `deposit_amount = ₦800k + cap × ₦180k` |
| Each scored submission | Counts toward `final_charge`                       |
| Shortlist delivered | `final_charge = ₦800k + scored_count × ₦180k`<br>`credit_returned = max(0, deposit_amount - final_charge)` is added to employer's credit |
| Future requests    | Credit applies (not yet implemented; deposits charge full)|

---

## 7. Recipes

### 7.1 Server Action calling the API

```ts
// app/employer/requests/new/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type CreateRequestPayload = {
  title: string;
  role_type?: string;
  role_level?: "entry-level" | "mid-level" | "senior";
  challenge_id: string;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string;
  custom_rubric?: { id?: string; title: string; description?: string; weight: number; sort_order?: number }[];
};

export async function createRequest(payload: CreateRequestPayload) {
  try {
    const data = await api<{ id: string }>("/employer/requests", {
      method: "POST",
      body: payload,
    });
    revalidatePath("/employer/requests");
    redirect(`/employer/requests/${data.id}`);
  } catch (err) {
    if (err instanceof ApiError) {
      // Surface the validation message to the form
      return { error: err.message, code: err.code };
    }
    throw err;
  }
}
```

```tsx
// app/employer/requests/new/page.tsx
"use client";
import { useFormState } from "react-dom";
import { createRequest } from "./actions";

const initial = { error: null, code: null };

export default function NewRequestPage() {
  const [state, formAction] = useFormState(createRequest, initial);
  return (
    <form action={formAction}>
      {/* ... form inputs ... */}
      {state?.error && <p className="text-red-600">{state.error}</p>}
      <button type="submit">Create draft</button>
    </form>
  );
}
```

### 7.2 Optimistic UI for triage

```tsx
"use client";
import { useOptimistic, useTransition } from "react";
import { apiClient } from "@/lib/api-client";

type Submission = { id: string; status: string; triage_decision: string | null };

export function TriageButtons({ submission }: { submission: Submission }) {
  const [optimistic, setOptimistic] = useOptimistic(submission);
  const [pending, startTransition] = useTransition();

  function triage(decision: "valid" | "invalid" | "returned") {
    startTransition(async () => {
      setOptimistic({
        ...submission,
        triage_decision: decision,
        status: decision === "valid" ? "under_review"
              : decision === "invalid" ? "rejected" : "returned",
      });
      await apiClient(`/admin/review/submissions/${submission.id}/triage`, {
        method: "POST",
        body: JSON.stringify({ decision, reason: "" }),
      });
    });
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => triage("valid")}    disabled={pending}>Valid</button>
      <button onClick={() => triage("returned")} disabled={pending}>Return</button>
      <button onClick={() => triage("invalid")}  disabled={pending}>Invalid</button>
      <span className="text-sm text-gray-500">Status: {optimistic.status}</span>
    </div>
  );
}
```

### 7.3 Polling vs. revalidation

For the **employer's request detail page** (where they're watching submissions
roll in), don't poll the server every few seconds — use Next's `revalidate`:

```ts
// app/employer/requests/[id]/page.tsx
import { api } from "@/lib/api";

export const revalidate = 30;   // revalidate at most every 30s

export default async function RequestPage({ params }: { params: { id: string } }) {
  const req = await api(`/employer/requests/${params.id}`, {
    next: { revalidate: 30, tags: [`request-${params.id}`] },
  });
  return <RequestDetail request={req} />;
}
```

For the **admin review queue** where reviewers triage one-by-one and need
fresh data after each action, use **`revalidateTag`** from your Server
Actions:

```ts
"use server";
import { revalidateTag } from "next/cache";

export async function triage(submissionId: string, requestId: string, decision: string) {
  await api(`/admin/review/submissions/${submissionId}/triage`, {
    method: "POST",
    body: { decision },
  });
  revalidateTag(`submissions-${requestId}`);
}
```

### 7.4 SWR setup (alternative to Server Components for live data)

```ts
// lib/swr-fetcher.ts
"use client";
import { apiClient } from "./api-client";
export const fetcher = (url: string) => apiClient(url);
```

```tsx
// any "use client" component
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

export function NotificationBell() {
  const { data, error } = useSWR<{ notifications: any[]; unread_count: number }>(
    "/employer/notifications?unread=true",
    fetcher,
    { refreshInterval: 30_000 }
  );
  return <span>{data?.unread_count ?? 0}</span>;
}
```

### 7.5 Rubric weight validator (frontend)

The backend validates weights sum to 100, but you should validate live in
the rubric builder UI:

```ts
export function rubricTotal(criteria: { weight: number }[]) {
  return criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
}

export function rubricStatus(criteria: { weight: number }[]) {
  const total = rubricTotal(criteria);
  if (total === 100) return { ok: true,  message: "Total: 100% ✓" };
  if (total < 100)   return { ok: false, message: `Total: ${total}% — add ${100 - total}% more` };
  return                    { ok: false, message: `Total: ${total}% — over by ${total - 100}%` };
}
```

Render this in red/green next to the rubric table, and disable the Submit
button when `!ok`.

### 7.6 Type definitions to copy into your project

Drop this into `types/api.ts` to share types across components:

```ts
export type UserRole =
  | "candidate" | "employer" | "admin_reviewer" | "admin_lead" | "system_admin";

export type ProposalStatus = "approved" | "pending" | "rejected";

export type RequestStatus =
  | "draft" | "published" | "evaluating" | "shortlisted" | "closed" | "cancelled";

export type SubmissionStatus =
  | "submitted" | "under_review" | "returned" | "scored" | "shortlisted" | "rejected";

export type TriageDecision = "valid" | "invalid" | "returned";

export type SkillLevel = "entry-level" | "mid-level" | "senior";

export type TeamSize = "1-10" | "11-50" | "51-200" | "201-500" | "500+";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  created_at: string;
}

export interface CatalogRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  status: ProposalStatus;
  proposed_by: string | null;
  reject_reason?: string | null;
  created_at: string;
  updated_at: string;
  catalog_skill_levels: { id: string; level: SkillLevel }[];
  catalog_capabilities: { id: string; title: string; summary: string | null }[];
  challenges?: { id: string; title: string; is_active: boolean; status: ProposalStatus }[];
}

export interface RubricCriterion {
  id?: string;
  title: string;
  description?: string | null;
  weight: number;
  sort_order?: number;
}

export interface Challenge {
  id: string;
  title: string;
  summary: string | null;
  scenario: string | null;
  deliverables: string[] | null;
  submission_format: string | null;
  constraints_text: string | null;
  submission_requirements: string | null;
  is_active: boolean;
  status: ProposalStatus;
  proposed_by: string | null;
  catalog_roles: { id: string; name: string };
  rubric_criteria: RubricCriterion[];
}

export interface JobRequest {
  id: string;
  title: string;
  role_type: string | null;
  role_level: SkillLevel | null;
  status: RequestStatus;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string | null;
  admin_fee: number;
  deposit_amount: number;
  final_charge: number | null;
  custom_rubric: RubricCriterion[] | null;
  snapshot_challenge: Challenge | null;
  snapshot_rubric: RubricCriterion[] | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  status: SubmissionStatus;
  artifact_urls: string[];
  artifact_type: "link" | "upload" | "both";
  submission_statement: string | null;
  integrity_declared: boolean;
  triage_decision: TriageDecision | null;
  triage_reason: string | null;
  reviewer_notes: string | null;
  total_score: number | null;
  resubmit_count: number;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}
```

---

## 8. Migration notes — what changed

If you've already started integrating against the v1.0 API, here's what's
different in v1.1:

### ⚠️ Breaking-ish changes

- **`PUT /admin/catalog/roles/{id}`**: now accepts `skill_levels` and
  `capabilities`. Previously it silently dropped them. Send the same shape
  as POST. If you were sending only `{ name, is_active }`, that still works.

- **`GET /employer/catalog/roles`** and **`GET /employer/catalog/challenges`**:
  response shape changed from a flat array to `{ approved: [...], my_proposals: [...] }`.
  Update your fetchers to read `.approved`. (`my_proposals` will be `[]` for
  any employer who hasn't proposed anything.)

- **`GET /admin/catalog/roles[?status=...]`**: the response array now
  includes `catalog_capabilities` for each role (was previously not
  returned). Existing UIs that ignored extra fields are fine; any TypeScript
  strict shape check will need updating.

### New endpoints

| Method | Path                                                         | Notes                            |
|--------|--------------------------------------------------------------|----------------------------------|
| POST   | `/employer/catalog/propose/role`                              | New B1                           |
| POST   | `/employer/catalog/propose/challenge`                         | New B2                           |
| GET    | `/admin/catalog/proposals/roles`                              | Pending role queue               |
| POST   | `/admin/catalog/proposals/roles/:id/review`                   | Approve/reject role              |
| GET    | `/admin/catalog/proposals/challenges`                         | Pending challenge queue          |
| POST   | `/admin/catalog/proposals/challenges/:id/review`              | Approve/reject challenge         |

### New request fields

- **`POST /employer/requests`** + **`PATCH /employer/requests/:id`** now
  accept `custom_rubric: RubricCriterion[]`. Validates weights sum to 100.
- All catalog responses now include `status` and `proposed_by` fields.
  Treat any role/challenge with `status !== "approved"` as not-yet-public.

### Bug fixes (frontend doesn't need to change anything, but symptoms gone)

- First-time submissions no longer 500 on the duplicate check (was
  `.single()`, now `.maybeSingle()`).
- `GET /candidate/submissions/{id}` no longer 500s on the access check.
- Employer dashboard no longer makes N+1 queries (faster now).
- Employer challenge detail correctly hides inactive / rejected challenges.

### Coming soon (not implemented yet — don't build against)

- Paystack integration is **stubbed** — `authorization_url` is a placeholder.
  When the backend team configures `PAYSTACK_SECRET_KEY`, the same endpoint
  contract will produce real Paystack URLs. Build your UI as if it's real.
- Per-employer credit balance isn't applied to subsequent deposits yet.
  `credit_returned` is recorded in the settlement, but new deposits charge
  the full computed amount.

---

## Quick reference card

```
BASE = process.env.NEXT_PUBLIC_API_URL

AUTH (shared)
  POST   /auth/register             body: { email, password, role, first_name?, last_name? }
  POST   /auth/verify-email         body: { email, otp }
  POST   /auth/resend-otp           body: { email }
  POST   /auth/login                body: { email, password }
  POST   /auth/refresh              body: { refresh_token }
  POST   /auth/logout               body: { refresh_token }
  POST   /auth/forgot-password      body: { email }
  POST   /auth/verify-reset-otp     body: { email, otp } → reset_token
  POST   /auth/reset-password       body: { reset_token, new_password }
  GET    /auth/me

ADMIN
  POST   /admin/auth/login                                                       body: { email, password }
  GET    /admin/auth/me
  POST   /admin/auth/create                                          system_admin body: { email, password, role, first_name? }
  GET    /admin/profile
  PATCH  /admin/profile                                                          body: { first_name?, last_name?, avatar_url?, old_password?, new_password? }
  GET    /admin/dashboard
  GET    /admin/users                                                system_admin ?role=&search=
  PATCH  /admin/users/:userId/toggle-active                          system_admin
  GET    /admin/catalog/roles                                                    ?active=false&status=pending|rejected
  POST   /admin/catalog/roles                                          admin_lead body: see §3.2
  GET    /admin/catalog/roles/:id
  PUT    /admin/catalog/roles/:id                                      admin_lead body: { name?, description?, is_active?, skill_levels?, capabilities? }
  DELETE /admin/catalog/roles/:id                                      admin_lead
  GET    /admin/catalog/challenges                                               ?active=false&status=pending
  POST   /admin/catalog/challenges                                     admin_lead body: see §3.3
  GET    /admin/catalog/challenges/:id
  PUT    /admin/catalog/challenges/:id                                 admin_lead
  DELETE /admin/catalog/challenges/:id                                 admin_lead
  GET    /admin/catalog/proposals/roles                                admin_lead
  POST   /admin/catalog/proposals/roles/:id/review                     admin_lead body: { decision, reason? }
  GET    /admin/catalog/proposals/challenges                           admin_lead
  POST   /admin/catalog/proposals/challenges/:id/review                admin_lead body: { decision, reason? }
  GET    /admin/review/requests                                                  ?status=
  GET    /admin/review/requests/:requestId/submissions
  GET    /admin/review/submissions/:id
  POST   /admin/review/submissions/:id/triage                                    body: { decision, reason? }
  POST   /admin/review/submissions/:id/score                                     body: { scores: [...], reviewer_notes? }
  GET    /admin/review/shortlists                                                ?status=
  GET    /admin/review/shortlists/:requestId/candidates
  POST   /admin/review/shortlists/:requestId/confirm                   admin_lead body: { selections: [{ candidate_id, submission_id, rank }] }
  POST   /admin/review/shortlists/:requestId/deliver                   admin_lead
  GET    /admin/wallet                                                           ?filter=oldest|latest|successful|failed
  GET    /admin/notifications                                                    ?unread=true&limit=
  POST   /admin/notifications/mark-read                                          body: { ids? }

EMPLOYER
  POST   /employer/auth/register                                                 body: { email, password, role: "employer", first_name? }
  POST   /employer/auth/login                                                    body: { email, password }
  GET    /employer/profile
  PATCH  /employer/profile
  GET    /employer/dashboard
  GET    /employer/workspace
  PATCH  /employer/workspace                                                     body: { company_name?, company_url?, industry?, team_size? }
  GET    /employer/catalog/roles                                                  → { approved, my_proposals }
  GET    /employer/catalog/challenges                                             ?role_id=
  GET    /employer/catalog/challenges/:id
  POST   /employer/catalog/propose/role                                          body: { name, description?, skill_levels?, capabilities? }
  POST   /employer/catalog/propose/challenge                                     body: { catalog_role_id, title, ..., rubric_criteria }
  GET    /employer/requests                                                      ?drafts=true&status=
  POST   /employer/requests                                                      body: { title, challenge_id, challenge_cap, shortlist_size, deadline, custom_rubric? }
  GET    /employer/requests/:id                                                   → request + submission_stats
  PATCH  /employer/requests/:id                                                  draft only
  POST   /employer/requests/:id/publish                                           → { request, payment: { authorization_url, payment_reference } }
  DELETE /employer/requests/:id                                                  closes the request
  GET    /employer/shortlists
  GET    /employer/shortlists/:id                                                 → evidence pack
  GET    /employer/billing
  POST   /employer/payments/initiate                                             body: { amount_ngn, job_request_id?, payment_type? }
  GET    /employer/payments/verify/:reference
  GET    /employer/payments/history
  GET    /employer/notifications                                                 ?unread=true
  POST   /employer/notifications/mark-read                                       body: { ids? }

CANDIDATE
  POST   /candidate/auth/register
  POST   /candidate/auth/login
  GET    /candidate/challenges                       PUBLIC                       ?search=
  GET    /candidate/challenges/:id                   PUBLIC
  GET    /candidate/profile
  PATCH  /candidate/profile                                                      body: { bio?, skills?, experience_years?, location?, linkedin_url?, portfolio_url? }
  PATCH  /candidate/settings                                                     body: { first_name?, avatar_url?, old_password?, new_password? }
  GET    /candidate/dashboard
  POST   /candidate/challenges/:requestId/submit                                 body: { artifact_urls, artifact_type, submission_statement?, integrity_declared: true }
  GET    /candidate/submissions
  GET    /candidate/submissions/:id
  GET    /candidate/notifications                                                ?unread=true
  POST   /candidate/notifications/mark-read                                      body: { ids? }

PAYMENTS
  POST   /payments/webhook            Paystack-only, header: x-paystack-signature
```

---

**Questions, broken endpoints, or missing fields?** Ping the backend team —
the contract above is what's deployed. If something doesn't match, it's a
backend bug to fix, not a frontend workaround to write.
