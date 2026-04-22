# Hack51 — Frontend Integration Guide (v2)

> **A practical, copy-paste-friendly guide for integrating the Hack51 API with a Next.js 14+ App Router frontend.**

This guide replaces the earlier version. Every response shape has been rewritten to show the **full response body** that the backend actually returns, so there is no ambiguity about what you will receive.

---

## Table of Contents

1. [Read This First](#1-read-this-first)
2. [How Every Response Is Shaped](#2-how-every-response-is-shaped)
3. [Authentication Overview](#3-authentication-overview)
4. [Setting Up Your Next.js Project](#4-setting-up-your-nextjs-project)
5. [How to Call the API (Two Patterns)](#5-how-to-call-the-api-two-patterns)
6. [Handling Errors](#6-handling-errors)
7. [Shared Auth Endpoints](#7-shared-auth-endpoints)
8. [Candidate Endpoints](#8-candidate-endpoints)
9. [Employer Endpoints](#9-employer-endpoints)
10. [Admin Endpoints](#10-admin-endpoints)
11. [Payments](#11-payments)
12. [Notifications](#12-notifications)
13. [State Diagrams](#13-state-diagrams)
14. [Error Code Reference](#14-error-code-reference)
15. [Common Mistakes to Avoid](#15-common-mistakes-to-avoid)
16. [Appendix: Endpoint Quick Reference](#appendix-endpoint-quick-reference)

---

## 1. Read This First

### 1.1 What was fixed in v1.1 of the backend

Before you start integrating, know that three things changed on the backend:

1. **`PUT /admin/catalog/roles/{id}` was broken.** It did not save `skill_levels` or `capabilities`. It is now fixed. You can send the same body shape as `POST /admin/catalog/roles`.

2. **Employers can now propose new roles and challenges** when the admin catalog does not have what they need. Two new endpoints exist: `POST /employer/catalog/propose/role` and `POST /employer/catalog/propose/challenge`. Admins approve or reject these in a new review queue.

3. **Job requests now accept a `custom_rubric` field.** The Figma flow shows the employer reviewing and editing the rubric before publishing. Send `custom_rubric` in the request body and the backend will use it as the locked snapshot at publish time, instead of the challenge's default rubric.

### 1.2 What stack this guide assumes

- **Next.js 14 or later, App Router** (not Pages Router).
- **TypeScript.**
- **Tokens stored in `httpOnly` cookies** — not `localStorage`, not `sessionStorage`. This is safer and works with React Server Components.
- **Browser `fetch` API** — no axios required.

If you are using a different stack, the concepts still apply but the code will need adapting.

### 1.3 Environment variables

Create a `.env.local` file at the root of your Next.js project:

```env
# The base URL of the Hack51 API, with no trailing slash.
NEXT_PUBLIC_API_BASE_URL=https://hack51.vercel.app
```

The `NEXT_PUBLIC_` prefix means it is safe to expose client-side. Only the URL is exposed, never any secret.

---

## 2. How Every Response Is Shaped

**This is the single most important thing to understand.** The Hack51 backend wraps every single response, success or error, in the same four-field envelope.

### 2.1 The envelope

```ts
interface ApiResponse<T> {
  status:  "success" | "error";
  message: string;
  data:    T | null;
  error:   { code: string; details?: string } | null;
}
```

When the call succeeds: `status` is `"success"`, `data` holds the result, and `error` is `null`.
When the call fails: `status` is `"error"`, `data` is `null`, and `error` holds a machine-readable code.

### 2.2 A real success example

Here is what the full response body looks like when you POST to `/auth/login` successfully:

```json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi...",
    "user": {
      "id": "a4f2c8d0-1234-5678-90ab-cdef12345678",
      "email": "ada@example.com",
      "role": "candidate",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "avatar_url": null,
      "is_verified": true,
      "created_at": "2026-01-15T10:23:00Z"
    }
  },
  "error": null
}
```

The actual business data you care about — the tokens and the user — is inside `data`, not at the top level.

### 2.3 A real error example

If you send the wrong password:

```json
{
  "status": "error",
  "message": "Invalid email or password",
  "data": null,
  "error": {
    "code": "INVALID_CREDENTIALS"
  }
}
```

Notice that `data` is `null` and `error` has a `code`. **Always branch on `error.code`, never on `message`.** Message text can change; the code is a stable contract.

### 2.4 What this means for your code

You have two choices when writing frontend code:

- **Option A:** keep the full envelope and read `.data` yourself. This is what the browser's `fetch` returns by default.
- **Option B:** use a wrapper function (like the `apiFetch` in §5.2) that unwraps `.data` automatically and throws on errors.

Throughout the rest of this guide, **every response block shows the full envelope**. When you see:

```json
{
  "status": "success",
  "message": "Roles retrieved.",
  "data": [ /* actual data */ ],
  "error": null
}
```

that is the complete response body, exactly what comes out of the backend. The thing you actually consume is whatever is inside `data`.

### 2.5 HTTP status codes used

The backend uses standard HTTP codes:

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad request — something in the body was logically wrong |
| 401 | Unauthorized — no token, invalid token, or expired token |
| 403 | Forbidden — valid token but wrong role, account not verified, or deactivated |
| 404 | Not found |
| 409 | Conflict — duplicate resource, or current state does not allow this operation |
| 422 | Validation error — the request body did not match the Zod schema |
| 500 | Unexpected server error |

Even on error responses, the envelope shape is the same.

---

## 3. Authentication Overview

### 3.1 The three tokens

| Token | Lifetime | Purpose |
|---|---|---|
| **access_token** | 15 minutes | Sent with every authenticated request. Short-lived to limit damage if stolen. |
| **refresh_token** | 30 days | Used only to get a new access token when the current one expires. |
| **reset_token** | 10 minutes | A one-time token issued during password reset. Used only once, in the next API call. |

### 3.2 How to authenticate a request

Put the access token in the `Authorization` header, with the word `Bearer` and a single space in front of it:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Do not add any prefix other than `Bearer `. Do not include the quotes. Do not base64-encode it — it is already encoded.

### 3.3 The full auth journey

Here is the end-to-end flow, from a new user registering to using the app:

```
1. POST /auth/register            (no auth)
        ↓
   Backend sends a 6-digit OTP to email
        ↓
2. POST /auth/verify-email        (no auth)
        ↓
   Account activated
        ↓
3. POST /auth/login               (no auth)
        ↓
   Response has { access_token, refresh_token, user }
        ↓
4. Frontend stores tokens in httpOnly cookies
        ↓
5. All subsequent calls send Authorization: Bearer <access_token>
        ↓
   ... 15 minutes pass, access token expires ...
        ↓
6. Next API call returns 401
        ↓
7. Frontend calls POST /auth/refresh with { refresh_token }
        ↓
   Gets back a new access_token AND a new refresh_token
        ↓
   (Backend revokes the old refresh token immediately)
        ↓
8. Frontend retries the original call with the new access token
```

### 3.4 Refresh token rotation — critical to understand

Every time you call `/auth/refresh`:

- The old refresh token is **revoked immediately**.
- A **new** refresh token is returned along with the new access token.
- You must replace **both** tokens in your storage.

If the same refresh token is ever presented twice, the backend assumes it was stolen and **revokes every single session for that user across all devices**. You will then get an error with `code: "REFRESH_TOKEN_REUSE"` and must force the user to log in again.

This is why you should never call `/auth/refresh` manually from component code. Put it behind a single helper (shown in §5.2) that you call from exactly one place.

---

## 4. Setting Up Your Next.js Project

### 4.1 Why store tokens in cookies, not localStorage

- `localStorage` is readable by any JavaScript running on the page. If there is ever an XSS vulnerability, the attacker grabs the tokens.
- `httpOnly` cookies are invisible to JavaScript. The browser attaches them to requests automatically, but no script can read them.
- Cookies also work with React Server Components — your RSC can read them directly through `cookies()` from `next/headers`.

### 4.2 The file layout we will build

```
your-nextjs-app/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── set-tokens/route.ts     ← writes tokens to httpOnly cookies after login
│   │   │   ├── clear-tokens/route.ts   ← deletes cookies on logout
│   │   │   └── logout/route.ts         ← calls backend /auth/logout and clears cookies
│   │   └── proxy/
│   │       └── [...path]/route.ts      ← forwards client calls to the backend, adding auth
│   ├── (auth)/login/page.tsx           ← the login page
│   ├── candidate/...                   ← candidate pages
│   ├── employer/...                    ← employer pages
│   └── admin/...                       ← admin pages
├── lib/
│   ├── api/
│   │   ├── server.ts                   ← server-side API client (for RSC, Server Actions, Route Handlers)
│   │   └── client.ts                   ← client-side helpers (for Client Components)
│   └── types.ts                        ← TypeScript types for API responses
├── middleware.ts                       ← protects routes by role
└── .env.local
```

### 4.3 Setting cookies after login (Route Handler)

Create `app/api/auth/set-tokens/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, error: "Missing tokens" },
      { status: 400 },
    );
  }

  const c = cookies();

  // Access token: short-lived, 15 minutes.
  c.set("h51_access", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });

  // Refresh token: long-lived, 30 days.
  c.set("h51_refresh", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
```

### 4.4 Clearing cookies on logout

Create `app/api/auth/clear-tokens/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const c = cookies();
  c.delete("h51_access");
  c.delete("h51_refresh");
  return NextResponse.json({ ok: true });
}
```

### 4.5 Middleware: protecting routes by role

Create `middleware.ts` at the root of your project (not inside `app/`):

```ts
import { NextRequest, NextResponse } from "next/server";

function decodeJwtPayload(token: string): { role?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public routes — let these through without any check.
  const publicPaths = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];
  if (publicPaths.some((p) => path.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("h51_access")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  if (path.startsWith("/admin")) {
    const adminRoles = ["admin_reviewer", "admin_lead", "system_admin"];
    if (!role || !adminRoles.includes(role)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  } else if (path.startsWith("/employer") && role !== "employer") {
    return NextResponse.redirect(new URL("/login", req.url));
  } else if (path.startsWith("/candidate") && role !== "candidate") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Important:** we decode the JWT without verifying its signature. This is fine for a UI-level check — the backend always rejects an invalid or tampered token. Never trust the decoded payload for security decisions; trust only the backend's response.

---

## 5. How to Call the API (Two Patterns)

There are two situations in a Next.js app where you call the API, and they need different approaches.

### 5.1 Which pattern to use when

| Where you are writing code | Pattern |
|---|---|
| React Server Component (default in App Router) | **Pattern A** — direct server-side call |
| Server Action (functions marked `"use server"`) | **Pattern A** |
| Route Handler (files inside `app/api/`) | **Pattern A** |
| Client Component (files marked `"use client"`) | **Pattern B** — call through a proxy |

**Pattern A** is faster and cleaner. Use it whenever possible. Only use Pattern B when you genuinely need to be in a client component (for example, inside an `onClick` handler or an interactive form).

### 5.2 Pattern A — server-side API client

Create `lib/api/server.ts`. This is the single file that handles auth, refresh, and error handling for all server-side calls.

```ts
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

// The envelope every response is wrapped in.
export interface ApiEnvelope<T> {
  status: "success" | "error";
  message: string;
  data: T | null;
  error: { code: string; details?: string } | null;
}

// A typed error class we throw when a request fails.
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus: number,
    public details?: string,
  ) {
    super(message);
  }
}

// Refresh the access token using the refresh token in the cookie.
// Returns the new access token on success, or null if refresh failed.
async function refreshAccessToken(): Promise<string | null> {
  const c = cookies();
  const refresh = c.get("h51_refresh")?.value;
  if (!refresh) return null;

  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: "no-store",
  });

  const envelope = (await res.json()) as ApiEnvelope<{
    access_token: string;
    refresh_token: string;
  }>;

  if (envelope.status !== "success" || !envelope.data) return null;

  // Rotate both cookies with the new tokens.
  c.set("h51_access", envelope.data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
  c.set("h51_refresh", envelope.data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return envelope.data.access_token;
}

/**
 * Call a Hack51 API endpoint.
 *
 * Attaches the Bearer token automatically.
 * Refreshes the access token on a 401, then retries once.
 * Throws ApiError if the response is not successful.
 *
 * Returns ONLY the `data` field of the envelope. The envelope is unwrapped for you.
 * This means when you call:
 *     const user = await apiFetch<User>("/auth/me");
 * `user` holds the content of `data`, not the full envelope.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const c = cookies();
  const { skipAuth, ...rest } = init;

  const buildHeaders = (token: string | null): Record<string, string> => ({
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const initialToken = skipAuth ? null : c.get("h51_access")?.value ?? null;
  let res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: buildHeaders(initialToken),
    cache: "no-store",
  });

  // Access token expired? Refresh once, retry the call.
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${BASE}${path}`, {
        ...rest,
        headers: buildHeaders(newToken),
        cache: "no-store",
      });
    }
  }

  const envelope = (await res.json()) as ApiEnvelope<T>;

  if (envelope.status === "error" || !res.ok) {
    throw new ApiError(
      envelope.error?.code ?? "UNKNOWN",
      envelope.message ?? "Request failed",
      res.status,
      envelope.error?.details,
    );
  }

  return envelope.data as T;
}
```

**Using Pattern A in a React Server Component:**

```tsx
// app/candidate/dashboard/page.tsx
import { apiFetch } from "@/lib/api/server";

interface DashboardData {
  summary: {
    total_submissions: number;
    total_shortlisted: number;
    unread_notifications: number;
    by_status: Record<string, number>;
  };
  recent_submissions: unknown[];
  shortlists: unknown[];
  profile: unknown;
}

export default async function CandidateDashboardPage() {
  const dashboard = await apiFetch<DashboardData>("/candidate/dashboard");

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total submissions: {dashboard.summary.total_submissions}</p>
      <p>Shortlisted: {dashboard.summary.total_shortlisted}</p>
      <p>Unread notifications: {dashboard.summary.unread_notifications}</p>
    </div>
  );
}
```

Notice that `apiFetch<DashboardData>` returns `DashboardData` directly. You do not write `dashboard.data.summary`; you write `dashboard.summary`. The envelope is unwrapped for you.

### 5.3 Pattern B — client-side through a proxy

Client components cannot read httpOnly cookies, so they need a relay. Create a single proxy route that forwards all client-side calls to the backend, attaching the auth cookie server-side.

Create `app/api/proxy/[...path]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

async function forward(
  req: NextRequest,
  method: string,
  params: { path: string[] },
) {
  const c = cookies();
  const token = c.get("h51_access")?.value;

  const url = `${BASE}/${params.path.join("/")}${req.nextUrl.search}`;
  const body = ["GET", "DELETE", "HEAD"].includes(method)
    ? undefined
    : await req.text();

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    cache: "no-store",
  });

  // Forward the response body and status back to the client unchanged.
  // The client sees the full envelope.
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET    = (req: NextRequest, ctx: any) => forward(req, "GET",    ctx.params);
export const POST   = (req: NextRequest, ctx: any) => forward(req, "POST",   ctx.params);
export const PUT    = (req: NextRequest, ctx: any) => forward(req, "PUT",    ctx.params);
export const PATCH  = (req: NextRequest, ctx: any) => forward(req, "PATCH",  ctx.params);
export const DELETE = (req: NextRequest, ctx: any) => forward(req, "DELETE", ctx.params);
```

Now create `lib/api/client.ts` — a tiny client-side helper that unwraps the envelope:

```ts
// This file runs in the browser. It calls /api/proxy/* on your own Next.js server,
// which then forwards to the Hack51 backend.

export interface ApiEnvelope<T> {
  status: "success" | "error";
  message: string;
  data: T | null;
  error: { code: string; details?: string } | null;
}

export class ApiError extends Error {
  constructor(public code: string, message: string, public httpStatus: number) {
    super(message);
  }
}

export async function clientFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const envelope = (await res.json()) as ApiEnvelope<T>;

  if (envelope.status === "error" || !res.ok) {
    throw new ApiError(
      envelope.error?.code ?? "UNKNOWN",
      envelope.message ?? "Request failed",
      res.status,
    );
  }

  return envelope.data as T;
}
```

**Using Pattern B in a Client Component:**

```tsx
// app/candidate/submissions/[id]/RefreshButton.tsx
"use client";

import { useState } from "react";
import { clientFetch, ApiError } from "@/lib/api/client";

interface Submission {
  id: string;
  status: string;
  total_score: number | null;
}

export function RefreshButton({ submissionId }: { submissionId: string }) {
  const [data, setData]   = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      const submission = await clientFetch<Submission>(
        `/candidate/submissions/${submissionId}`,
      );
      setData(submission);
    } catch (err) {
      if (err instanceof ApiError) setError(err.code);
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Refresh</button>
      {data && <p>Status: {data.status}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### 5.4 Rule of thumb

- If the result is needed to render the page → Pattern A in a React Server Component.
- If the result comes from a user action (button click, form submit) → Server Action (Pattern A) or Pattern B.
- Never call the Hack51 backend directly from the browser. Always go through your own server code or the proxy.

### 5.5 What the raw envelope looks like when you don't unwrap

If for some reason you skip `apiFetch` / `clientFetch` and call the proxy directly with plain `fetch`, here is what you see:

```ts
"use client";

async function handleLogin() {
  const res = await fetch("/api/proxy/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", password: "Pass1234!" }),
  });

  const envelope = await res.json();
  // envelope is the FULL body:
  // {
  //   status: "success",
  //   message: "Login successful.",
  //   data: { access_token, refresh_token, user },
  //   error: null
  // }

  if (envelope.status !== "success") {
    console.error("Login failed:", envelope.error?.code);
    return;
  }

  // The thing you want is in envelope.data:
  const { access_token, refresh_token, user } = envelope.data;
}
```

The rest of this guide shows **full envelope responses**. When using `apiFetch` or `clientFetch`, mentally strip the envelope — you receive only the `data` field.

---

## 6. Handling Errors

Whenever a request fails, the envelope has `status: "error"` and a code inside `error.code`. **Always branch on the code.**

### 6.1 Common codes

Full list in §14. A few you will see most often:

- `VALIDATION_ERROR` — the request body did not match the Zod schema. `error.details` is a JSON string describing which field failed and why.
- `INVALID_CREDENTIALS` — wrong email or password.
- `EMAIL_NOT_VERIFIED` — the user needs to complete OTP verification first.
- `REFRESH_TOKEN_REUSE` — serious. Force a full logout.
- `WORKSPACE_NOT_FOUND` — an employer tried to create a request before completing workspace setup.
- `ALREADY_SUBMITTED` — a candidate tried to submit twice.
- `NOT_DRAFT` — an employer tried to edit or publish a request that is no longer a draft.

### 6.2 A reusable error handler

```ts
import { ApiError } from "@/lib/api/server"; // or client

function handleApiError(err: unknown): string {
  if (!(err instanceof ApiError)) {
    return "Something went wrong. Please try again.";
  }

  switch (err.code) {
    case "VALIDATION_ERROR":
      return "Please check the form fields and try again.";
    case "INVALID_CREDENTIALS":
      return "Email or password is incorrect.";
    case "EMAIL_NOT_VERIFIED":
      return "Please verify your email first.";
    case "REFRESH_TOKEN_REUSE":
      if (typeof window !== "undefined") window.location.href = "/login";
      return "Your session has expired. Please log in again.";
    case "ALREADY_SUBMITTED":
      return "You have already submitted to this challenge.";
    case "CHALLENGE_CLOSED":
      return "This challenge is no longer accepting submissions.";
    case "DEADLINE_PASSED":
      return "The submission deadline has passed.";
    default:
      return err.message || "Request failed.";
  }
}
```

### 6.3 Parsing validation errors for per-field feedback

On `VALIDATION_ERROR`, the `details` field contains JSON describing which fields failed. Parse it to show inline errors:

```ts
if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details) {
  try {
    const issues = JSON.parse(err.details);
    // issues is an array like [{ path: ["email"], message: "Must be a valid email address" }, ...]
    const fieldErrors: Record<string, string> = {};
    for (const issue of issues) {
      const field = issue.path?.join(".") ?? "form";
      fieldErrors[field] = issue.message;
    }
    // fieldErrors is now: { email: "Must be a valid email address", password: "..." }
    // Apply these to your form inputs.
  } catch {
    // details was not valid JSON — just show the generic message.
  }
}
```

---

## 7. Shared Auth Endpoints

These endpoints work for every role. For candidate/employer registration you can use either `/auth/register` or the role-specific endpoint — they behave identically.

### 7.1 Register

**Endpoint:** `POST /auth/register` (also `POST /candidate/auth/register`, `POST /employer/auth/register`)
**Auth:** none

**Request body:**
```json
{
  "email": "ada@example.com",
  "password": "SecurePass1!",
  "role": "candidate",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

- `role` must be `"candidate"` or `"employer"`. Admin accounts cannot be self-registered.
- `password` must be at least 8 characters, with one uppercase, one lowercase, one digit, one special character.
- `first_name`, `last_name`, `avatar_url` are optional.

**Full response body on success (HTTP 201):**
```json
{
  "status": "success",
  "message": "Candidate account created. Check your email for a verification code.",
  "data": {
    "user": {
      "id": "a4f2c8d0-1234-5678-90ab-cdef12345678",
      "email": "ada@example.com",
      "role": "candidate",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "avatar_url": null,
      "is_verified": false,
      "created_at": "2026-04-21T10:00:00Z"
    }
  },
  "error": null
}
```

**Side effect:** a 6-digit OTP is emailed to the user.

**Possible errors:**
- `409 EMAIL_EXISTS` — account already registered.
- `422 VALIDATION_ERROR` — password too weak, invalid email, etc.
- `403 ADMIN_SELF_REGISTER_FORBIDDEN` — tried to register as admin.

**Complete Next.js example (Client Component + Server Action):**

```tsx
// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";

interface RegisterResponse {
  user: { id: string; email: string; role: string };
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await clientFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, role }),
      });
      // Go to the OTP verification page, pass email along.
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "EMAIL_EXISTS") setError("An account with this email already exists.");
        else if (err.code === "VALIDATION_ERROR") setError("Please check your details.");
        else setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <select value={role} onChange={(e) => setRole(e.target.value as any)}>
        <option value="candidate">Candidate</option>
        <option value="employer">Employer</option>
      </select>
      <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
```

### 7.2 Verify email

**Endpoint:** `POST /auth/verify-email`
**Auth:** none

**Request body:**
```json
{ "email": "ada@example.com", "otp": "482913" }
```

**Full response body on success:**
```json
{
  "status": "success",
  "message": "Email verified successfully",
  "data": { "message": "Email verified successfully" },
  "error": null
}
```

**Side effects:** account is marked verified. Workspace (for employers) or candidate profile (for candidates) is auto-created. Welcome email is sent.

**Possible errors:**
- `400 OTP_EXPIRED` — OTP is older than 10 minutes.
- `400 OTP_INVALID` — wrong code.
- `404 USER_NOT_FOUND`
- `409 ALREADY_VERIFIED`

### 7.3 Resend OTP

**Endpoint:** `POST /auth/resend-otp`
**Auth:** none
**Rate-limited:** 5 requests per 5 minutes per IP.

**Request body:**
```json
{ "email": "ada@example.com" }
```

**Full response body on success:**
```json
{
  "status": "success",
  "message": "OTP resent",
  "data": { "message": "Verification code resent" },
  "error": null
}
```

### 7.4 Login

**Endpoint:** `POST /auth/login` (also `/candidate/auth/login`, `/employer/auth/login`, `/admin/auth/login`)
**Auth:** none

Use the role-specific endpoint where possible — it adds an extra server-side check that the account matches that role. The generic `/auth/login` accepts any role.

**Request body:**
```json
{ "email": "ada@example.com", "password": "SecurePass1!" }
```

**Full response body on success (HTTP 200):**
```json
{
  "status": "success",
  "message": "Candidate login successful.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a4f2c8d0-...",
      "email": "ada@example.com",
      "role": "candidate",
      "first_name": "Ada",
      "last_name": "Lovelace",
      "avatar_url": null,
      "is_verified": true,
      "created_at": "2026-01-15T..."
    }
  },
  "error": null
}
```

**Possible errors:**
- `401 INVALID_CREDENTIALS`
- `403 EMAIL_NOT_VERIFIED` — the account exists but the OTP step was not completed.
- `403 ACCOUNT_INACTIVE` — deactivated by an admin.
- `403 WRONG_ROLE_LOGIN` — used the wrong role-specific login endpoint.

**Complete Next.js login flow:**

```tsx
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LoginData {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; role: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Step 1: call the login endpoint through the proxy.
    const loginRes = await fetch("/api/proxy/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const envelope = await loginRes.json();

    if (envelope.status !== "success") {
      // Handle well-known error codes.
      if (envelope.error?.code === "INVALID_CREDENTIALS") {
        setError("Email or password is incorrect.");
      } else if (envelope.error?.code === "EMAIL_NOT_VERIFIED") {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (envelope.error?.code === "ACCOUNT_INACTIVE") {
        setError("Your account has been deactivated. Contact support.");
      } else {
        setError(envelope.message);
      }
      return;
    }

    // Step 2: give the tokens to our Route Handler so it writes them into httpOnly cookies.
    const { access_token, refresh_token, user } = envelope.data as LoginData;
    await fetch("/api/auth/set-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    });

    // Step 3: redirect based on role.
    if (user.role === "candidate")      router.push("/candidate/dashboard");
    else if (user.role === "employer")  router.push("/employer/dashboard");
    else                                  router.push("/admin/dashboard");
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="email"    value={email}    onChange={(e) => setEmail(e.target.value)}    required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Log in</button>
      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
```

### 7.5 Refresh token

**Endpoint:** `POST /auth/refresh`
**Auth:** none (the refresh token itself is the credential)

**Do not call this from component code.** The `apiFetch` helper handles it automatically on a 401. This section is reference only.

**Request body:**
```json
{ "refresh_token": "eyJ..." }
```

**Full response body on success:**
```json
{
  "status": "success",
  "message": "Tokens refreshed",
  "data": {
    "access_token": "eyJ... (new)",
    "refresh_token": "eyJ... (new)"
  },
  "error": null
}
```

**Possible errors:**
- `401 REFRESH_TOKEN_REUSE` — critical, force a full logout.

### 7.6 Logout

**Endpoint:** `POST /auth/logout`
**Auth:** Bearer

**Request body:**
```json
{ "refresh_token": "eyJ..." }
```

**Full response body on success:**
```json
{
  "status": "success",
  "message": "Logged out",
  "data": { "message": "Logged out successfully" },
  "error": null
}
```

Always returns 200, even if the token was already invalid or revoked.

**Complete Next.js logout flow (Route Handler that reads cookies, calls backend, clears cookies):**

```ts
// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!;

export async function POST() {
  const c = cookies();
  const access  = c.get("h51_access")?.value;
  const refresh = c.get("h51_refresh")?.value;

  if (access && refresh) {
    try {
      await fetch(`${BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {
      // Ignore errors — we're logging out anyway.
    }
  }

  c.delete("h51_access");
  c.delete("h51_refresh");
  return NextResponse.json({ ok: true });
}
```

And a client-side logout button:

```tsx
"use client";
export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
    >
      Log out
    </button>
  );
}
```

### 7.7 Password reset (3 steps)

**Step 1: Request a reset code**

`POST /auth/forgot-password`, no auth.

Request:
```json
{ "email": "ada@example.com" }
```

Response (always succeeds to prevent email enumeration):
```json
{
  "status": "success",
  "message": "Reset code sent (if account exists)",
  "data": { "message": "If that email is registered, a reset code has been sent." },
  "error": null
}
```

**Step 2: Verify the reset OTP**

`POST /auth/verify-reset-otp`, no auth.

Request:
```json
{ "email": "ada@example.com", "otp": "391045" }
```

Response on success:
```json
{
  "status": "success",
  "message": "OTP verified",
  "data": { "reset_token": "eyJ... (10 minute lifetime, single use)" },
  "error": null
}
```

**Step 3: Set the new password**

`POST /auth/reset-password`, no auth.

Request:
```json
{ "reset_token": "eyJ...", "new_password": "NewSecure1!" }
```

Response on success:
```json
{
  "status": "success",
  "message": "Password reset",
  "data": { "message": "Password reset successfully. Please sign in with your new password." },
  "error": null
}
```

**Important:** on success, all existing refresh tokens for this user are revoked across all devices. The user must log in again.

### 7.8 Who am I

**Endpoint:** `GET /auth/me`
**Auth:** Bearer

**Full response body on success:**
```json
{
  "status": "success",
  "message": "Current user",
  "data": {
    "id": "a4f2...",
    "email": "ada@example.com",
    "role": "candidate",
    "first_name": "Ada",
    "last_name": "Lovelace",
    "avatar_url": null,
    "is_verified": true,
    "created_at": "2026-01-15T..."
  },
  "error": null
}
```

Use this at the top of a protected page to get the current user:

```tsx
// app/candidate/layout.tsx
import { apiFetch } from "@/lib/api/server";

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

export default async function CandidateLayout({ children }: { children: React.ReactNode }) {
  const user = await apiFetch<CurrentUser>("/auth/me");
  return (
    <div>
      <header>Welcome, {user.first_name ?? user.email}</header>
      {children}
    </div>
  );
}
```

---

## 8. Candidate Endpoints

### 8.1 Browse open challenges (PUBLIC — no auth!)

**Endpoint:** `GET /candidate/challenges?search=optional`
**Auth:** none — anyone can see what's hiring.

**Full response body:**
```json
{
  "status": "success",
  "message": "Open challenges retrieved.",
  "data": [
    {
      "id": "req-uuid",
      "title": "Senior Product Designer",
      "role_type": "Product Designer",
      "role_level": "senior",
      "challenge_cap": 21,
      "shortlist_size": 5,
      "deadline": "2026-06-01T00:00:00Z",
      "published_at": "2026-04-10T...",
      "created_at": "2026-04-08T...",
      "challenges": {
        "id": "ch-uuid",
        "title": "Mobile banking redesign",
        "summary": "Redesign the onboarding flow...",
        "scenario": "You've been hired by...",
        "deliverables": ["Figma file", "User flow diagram"],
        "submission_format": "Figma link",
        "constraints_text": "Max 8 screens",
        "rubric_criteria": [
          { "title": "Visual Design", "weight": 30 },
          { "title": "UX Reasoning", "weight": 40 },
          { "title": "Prototype Quality", "weight": 30 }
        ]
      },
      "workspaces": {
        "company_name": "Acme Corp",
        "industry": "Fintech",
        "logo_url": "https://..."
      }
    }
  ],
  "error": null
}
```

Note: `data` is an **array**. The search parameter does a case-insensitive substring match on the request title.

**Complete Next.js example:**

```tsx
// app/challenges/page.tsx
import { apiFetch } from "@/lib/api/server";
import Link from "next/link";

interface OpenChallenge {
  id: string;
  title: string;
  role_type: string;
  role_level: string;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string | null;
  workspaces: { company_name: string; logo_url: string | null };
}

export default async function PublicChallengesPage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
  const path = searchParams.search
    ? `/candidate/challenges?search=${encodeURIComponent(searchParams.search)}`
    : "/candidate/challenges";
  const challenges = await apiFetch<OpenChallenge[]>(path, { skipAuth: true });

  return (
    <main>
      <h1>Open Challenges</h1>
      {challenges.length === 0 ? (
        <p>No challenges currently open.</p>
      ) : (
        <ul>
          {challenges.map((ch) => (
            <li key={ch.id}>
              <Link href={`/challenges/${ch.id}`}>
                <h3>{ch.title}</h3>
                <p>{ch.workspaces.company_name}</p>
                <p>Cap: {ch.challenge_cap} | Shortlist: {ch.shortlist_size}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
```

### 8.2 Get one open challenge (PUBLIC)

**Endpoint:** `GET /candidate/challenges/:id`
**Auth:** none

The `:id` is the **job_request id**, not the challenge template id.

**Full response body:**
```json
{
  "status": "success",
  "message": "Challenge detail retrieved.",
  "data": {
    "id": "req-uuid",
    "title": "Senior Product Designer",
    "role_type": "Product Designer",
    "role_level": "senior",
    "challenge_cap": 21,
    "shortlist_size": 5,
    "deadline": "2026-06-01T00:00:00Z",
    "published_at": "2026-04-10T...",
    "snapshot_challenge": { /* frozen copy of challenge at publish time */ },
    "snapshot_rubric": [
      { "id": "cr-uuid", "title": "Visual Design",     "description": "...", "weight": 30, "sort_order": 0 },
      { "id": "cr-uuid", "title": "UX Reasoning",      "description": "...", "weight": 40, "sort_order": 1 },
      { "id": "cr-uuid", "title": "Prototype Quality", "description": "...", "weight": 30, "sort_order": 2 }
    ],
    "challenges": { /* live challenge reference */ },
    "workspaces": {
      "company_name": "Acme Corp",
      "industry": "Fintech",
      "logo_url": "https://...",
      "description": "..."
    }
  },
  "error": null
}
```

**Important:** use `snapshot_rubric` (not `challenges.rubric_criteria`) when showing candidates the rubric. If the employer used `custom_rubric`, the snapshot reflects that — the live challenge rubric may differ.

### 8.3 Submit to a challenge

**Endpoint:** `POST /candidate/challenges/:id/submit`
**Auth:** Bearer (candidate role only)
**`:id` is the job_request id**, not the challenge template id.

**Request body:**
```json
{
  "artifact_urls": ["https://github.com/user/repo"],
  "artifact_type": "link",
  "submission_statement": "All work is my own.",
  "integrity_declared": true
}
```

- `artifact_urls`: array of 1–10 URLs.
- `artifact_type`: `"link"`, `"upload"`, or `"both"`.
- `submission_statement`: optional, max 2000 characters.
- `integrity_declared`: **must be literally `true`** (not `"true"`, not `1`).

**Full response body on success (HTTP 201):**
```json
{
  "status": "success",
  "message": "Submission received. We'll notify you of the outcome.",
  "data": {
    "id": "sub-uuid",
    "job_request_id": "req-uuid",
    "candidate_id": "user-uuid",
    "status": "submitted",
    "artifact_urls": ["https://github.com/user/repo"],
    "artifact_type": "link",
    "submission_statement": "All work is my own.",
    "integrity_declared": true,
    "submitted_at": "2026-04-21T14:00:00Z",
    "created_at": "2026-04-21T14:00:00Z",
    "updated_at": "2026-04-21T14:00:00Z"
  },
  "error": null
}
```

**Possible errors:**
- `409 ALREADY_SUBMITTED` — an existing non-returned submission already exists. A resubmission only works if the previous status was `returned`.
- `403 CHALLENGE_CLOSED` — job request is no longer in `published` status.
- `403 DEADLINE_PASSED`.
- `422 VALIDATION_ERROR` — most commonly because `integrity_declared` was not `true`.

**Complete Next.js submission form:**

```tsx
// app/candidate/challenges/[id]/submit/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";

interface Submission {
  id: string;
  status: string;
  submitted_at: string;
}

export default function SubmitPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [artifactUrl, setArtifactUrl]   = useState("");
  const [statement, setStatement]       = useState("");
  const [integrityOk, setIntegrityOk]   = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [loading, setLoading]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!integrityOk) {
      setError("You must confirm the integrity declaration.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submission = await clientFetch<Submission>(
        `/candidate/challenges/${requestId}/submit`,
        {
          method: "POST",
          body: JSON.stringify({
            artifact_urls: [artifactUrl],
            artifact_type: "link",
            submission_statement: statement,
            integrity_declared: true, // must be the literal boolean true
          }),
        },
      );
      router.push(`/candidate/submissions/${submission.id}?submitted=true`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "ALREADY_SUBMITTED") setError("You have already submitted to this challenge.");
        else if (err.code === "CHALLENGE_CLOSED") setError("This challenge is no longer accepting submissions.");
        else if (err.code === "DEADLINE_PASSED") setError("The deadline has passed.");
        else setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Repository URL
        <input type="url" value={artifactUrl} onChange={(e) => setArtifactUrl(e.target.value)} required />
      </label>

      <label>
        Submission statement (optional)
        <textarea value={statement} onChange={(e) => setStatement(e.target.value)} maxLength={2000} />
      </label>

      <label>
        <input type="checkbox" checked={integrityOk} onChange={(e) => setIntegrityOk(e.target.checked)} />
        I declare that this work is my own and I have used AI only for brainstorming.
      </label>

      <button type="submit" disabled={loading || !integrityOk}>
        {loading ? "Submitting..." : "Submit"}
      </button>

      {error && <p className="text-red-600">{error}</p>}
    </form>
  );
}
```

### 8.4 My submissions

**Endpoint:** `GET /candidate/submissions`
**Auth:** Bearer (candidate)

**Full response body:**
```json
{
  "status": "success",
  "message": "Submissions retrieved.",
  "data": [
    {
      "id": "sub-uuid",
      "status": "scored",
      "artifact_urls": ["https://github.com/..."],
      "submission_statement": "...",
      "triage_decision": "valid",
      "triage_reason": null,
      "reviewer_notes": "Strong technical approach.",
      "total_score": 87.5,
      "resubmit_count": 0,
      "submitted_at": "2026-04-15T...",
      "updated_at": "2026-04-18T...",
      "job_requests": {
        "id": "req-uuid",
        "title": "Senior Engineer",
        "role_type": "Software Engineer",
        "role_level": "senior",
        "deadline": "2026-05-01T...",
        "workspaces": { "company_name": "Acme Corp" }
      }
    }
  ],
  "error": null
}
```

### 8.5 Single submission

**Endpoint:** `GET /candidate/submissions/:id`
**Auth:** Bearer (candidate, must own the submission)

**Full response body:**
```json
{
  "status": "success",
  "message": "Submission retrieved.",
  "data": {
    "id": "sub-uuid",
    "status": "scored",
    "artifact_urls": ["..."],
    "artifact_type": "link",
    "submission_statement": "...",
    "integrity_declared": true,
    "triage_decision": "valid",
    "triage_reason": null,
    "triaged_at": "2026-04-16T...",
    "reviewer_notes": "Strong.",
    "total_score": 87.5,
    "scored_at": "2026-04-17T...",
    "resubmit_count": 0,
    "submitted_at": "2026-04-15T...",
    "users": { "id": "...", "email": "...", "first_name": "Ada", "last_name": "Lovelace" },
    "job_requests": {
      "id": "req-uuid",
      "title": "...",
      "snapshot_challenge": { /* ... */ },
      "snapshot_rubric": [ /* ... */ ]
    },
    "submission_scores": [
      { "id": "sc-uuid", "criterion_id": "cr-uuid", "criterion_title": "Code Quality",  "weight": 30, "score_percent": 85 },
      { "id": "sc-uuid", "criterion_id": "cr-uuid", "criterion_title": "Technicality",  "weight": 30, "score_percent": 90 },
      { "id": "sc-uuid", "criterion_id": "cr-uuid", "criterion_title": "Functionality", "weight": 40, "score_percent": 85 }
    ]
  },
  "error": null
}
```

**Possible error:** `403 FORBIDDEN` if the submission does not belong to this candidate.

### 8.6 Candidate dashboard

**Endpoint:** `GET /candidate/dashboard`
**Auth:** Bearer (candidate)

**Full response body:**
```json
{
  "status": "success",
  "message": "Candidate dashboard loaded.",
  "data": {
    "summary": {
      "total_submissions": 3,
      "total_shortlisted": 1,
      "unread_notifications": 2,
      "by_status": { "submitted": 1, "scored": 1, "shortlisted": 1 }
    },
    "recent_submissions": [ /* up to 5 */ ],
    "shortlists": [
      {
        "id": "sl-uuid",
        "rank": 1,
        "total_score": 92.5,
        "confirmed_at": "2026-04-18T...",
        "job_requests": { "title": "Senior Engineer", "role_type": "..." }
      }
    ],
    "profile": {
      "skills": ["TypeScript", "React"],
      "experience_years": 5,
      "location": "Lagos"
    }
  },
  "error": null
}
```

### 8.7 Candidate profile

**`GET /candidate/profile`** — Bearer (candidate)

Full response:
```json
{
  "status": "success",
  "message": "Candidate profile retrieved.",
  "data": {
    "id": "profile-uuid",
    "user_id": "user-uuid",
    "bio": "Full-stack developer...",
    "skills": ["TypeScript", "React"],
    "experience_years": 5,
    "location": "Lagos, Nigeria",
    "linkedin_url": "https://linkedin.com/in/ada",
    "portfolio_url": "https://ada.dev",
    "updated_at": "2026-04-01T..."
  },
  "error": null
}
```

**`PATCH /candidate/profile`** — Bearer (candidate)

Request (all fields optional):
```json
{
  "bio": "Full-stack developer, 5 years experience",
  "skills": ["TypeScript", "React", "Node.js"],
  "experience_years": 5,
  "location": "Lagos, Nigeria",
  "linkedin_url": "https://linkedin.com/in/ada",
  "portfolio_url": "https://ada.dev"
}
```

Response:
```json
{
  "status": "success",
  "message": "Profile updated.",
  "data": { /* updated profile */ },
  "error": null
}
```

**`PATCH /candidate/settings`** — update name, avatar, or password.

Request:
```json
{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "avatar_url": "https://example.com/avatar.jpg",
  "old_password": "CurrentPass1!",
  "new_password": "NewSecurePass1!"
}
```

All fields optional. To change password, `old_password` and `new_password` must both be sent.

Possible errors:
- `400 OLD_PASSWORD_REQUIRED` — sent new_password without old_password.
- `400 WRONG_PASSWORD` — old_password was incorrect.

### 8.8 Candidate notifications

See §12 — notification endpoints are the same shape for every role.

---

## 9. Employer Endpoints

The employer flow is the largest section because the hiring wizard is the heart of the product.

### 9.1 Employer profile and workspace

**`GET /employer/workspace`** — Bearer (employer)

Full response:
```json
{
  "status": "success",
  "message": "Workspace retrieved.",
  "data": {
    "id": "ws-uuid",
    "owner_id": "user-uuid",
    "company_name": "Acme Corp",
    "company_url": "https://acme.com",
    "industry": "Fintech",
    "team_size": "11-50",
    "logo_url": "https://...",
    "description": "We build payment rails.",
    "created_at": "2026-01-15T...",
    "updated_at": "2026-03-20T..."
  },
  "error": null
}
```

**`PATCH /employer/workspace`** — update workspace fields.

Request (all optional):
```json
{
  "company_name": "Acme Corp",
  "company_url": "https://acme.com",
  "industry": "Fintech",
  "team_size": "11-50"
}
```

`team_size` must be one of: `"1-10"`, `"11-50"`, `"51-200"`, `"201-500"`, `"500+"`.

> **Note about the Figma signup form:** the Figma registration form collects `company_name` on signup. The backend's `/auth/register` does not accept this field. Collect `company_name` in your signup form, store it in `sessionStorage` through OTP verification, then after first login call `PATCH /employer/workspace` with the company name as the first step of onboarding.

### 9.2 Employer dashboard

**`GET /employer/dashboard`** — Bearer (employer)

**Full response body:**
```json
{
  "status": "success",
  "message": "Employer dashboard loaded.",
  "data": {
    "summary": {
      "total_requests": 12,
      "total_submissions": 245,
      "total_evaluations": 8,
      "total_shortlists_delivered": 42,
      "unread_notifications": 3,
      "by_status": { "draft": 2, "published": 3, "shortlisted": 7 }
    },
    "active_requests": [ /* published, up to 5 */ ],
    "recent_requests": [ /* all requests, up to 5 */ ]
  },
  "error": null
}
```

The Figma dashboard cards map directly:

| Figma label | Data field |
|---|---|
| Total Requests | `summary.total_requests` |
| Total Submissions | `summary.total_submissions` |
| Total Evaluations | `summary.total_evaluations` |
| Total Shortlists Delivered | `summary.total_shortlists_delivered` |

### 9.3 Browse the catalog

The employer uses this to build the wizard's "pick a role" and "pick a challenge" steps.

**`GET /employer/catalog/roles`** — Bearer (employer)

**Full response body:**
```json
{
  "status": "success",
  "message": "Roles retrieved.",
  "data": {
    "approved": [
      {
        "id": "role-uuid",
        "name": "Software Engineer",
        "description": "Full-stack engineer",
        "is_active": true,
        "status": "approved",
        "proposed_by": null,
        "catalog_skill_levels": [
          { "id": "sl-uuid", "level": "entry-level" },
          { "id": "sl-uuid", "level": "mid-level" },
          { "id": "sl-uuid", "level": "senior" }
        ],
        "catalog_capabilities": [
          { "id": "cap-uuid", "title": "API Design",    "summary": "Design RESTful APIs" },
          { "id": "cap-uuid", "title": "Data Modeling", "summary": "Relational and document" }
        ],
        "challenges": [
          { "id": "ch-uuid", "title": "API Optimization", "is_active": true, "status": "approved" }
        ],
        "created_at": "2026-01-01T...",
        "updated_at": "2026-01-01T..."
      }
    ],
    "my_proposals": [
      {
        "id": "role-uuid",
        "name": "Growth Marketing Lead",
        "status": "pending",
        "proposed_by": "this-employer-uuid",
        "reject_reason": null,
        "catalog_skill_levels": [ /* ... */ ],
        "catalog_capabilities": [ /* ... */ ],
        "challenges": []
      }
    ]
  },
  "error": null
}
```

**`approved`** is the list to show in the wizard. **`my_proposals`** is this employer's own pending/rejected proposals — show them in a separate "My submitted roles" section.

**`GET /employer/catalog/challenges?role_id=<uuid>`** — same envelope shape, same split between `approved` and `my_proposals`. The optional `role_id` filters by role.

**`GET /employer/catalog/challenges/:id`** — full detail of one challenge with rubric.

**Complete Next.js example — wizard Step 1 (pick role):**

```tsx
// app/employer/requests/new/step-1-role/page.tsx
import { apiFetch } from "@/lib/api/server";
import Link from "next/link";

interface Capability { id: string; title: string; summary: string | null }
interface Role {
  id: string;
  name: string;
  description: string | null;
  status: "approved" | "pending" | "rejected";
  reject_reason: string | null;
  catalog_skill_levels: { id: string; level: string }[];
  catalog_capabilities: Capability[];
  challenges: { id: string; title: string }[];
}

export default async function PickRolePage() {
  const { approved, my_proposals } = await apiFetch<{
    approved: Role[];
    my_proposals: Role[];
  }>("/employer/catalog/roles");

  return (
    <div>
      <h1>Step 1: Pick a role</h1>

      <section>
        <h2>Available roles</h2>
        <ul>
          {approved.map((role) => (
            <li key={role.id}>
              <Link href={`/employer/requests/new/step-2-challenge?role_id=${role.id}`}>
                <h3>{role.name}</h3>
                <p>{role.description}</p>
                <p>{role.challenges.length} challenge(s) available</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {my_proposals.length > 0 && (
        <section>
          <h2>My proposed roles</h2>
          <ul>
            {my_proposals.map((role) => (
              <li key={role.id}>
                <h3>{role.name}</h3>
                <p>Status: {role.status}</p>
                {role.status === "rejected" && <p>Reason: {role.reject_reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/employer/requests/new/propose-role">
        + Propose a new role
      </Link>
    </div>
  );
}
```

### 9.4 Propose a role or challenge

This is the new flow for when the catalog does not have what the employer needs.

**`POST /employer/catalog/propose/role`** — Bearer (employer)

Request:
```json
{
  "name": "Growth Marketing Lead",
  "description": "Drives growth strategy and experimentation",
  "skill_levels": ["mid-level", "senior"],
  "capabilities": [
    { "title": "Experiment Design", "summary": "A/B testing, funnel analysis" },
    { "title": "SEO Strategy",       "summary": "Technical and content SEO" }
  ]
}
```

Full response on success (HTTP 201):
```json
{
  "status": "success",
  "message": "Role proposal submitted. An admin will review and notify you.",
  "data": {
    "id": "role-uuid",
    "name": "Growth Marketing Lead",
    "description": "...",
    "is_active": true,
    "status": "pending",
    "proposed_by": "this-employer-uuid",
    "reject_reason": null,
    "catalog_skill_levels": [
      { "id": "sl-uuid", "level": "mid-level" },
      { "id": "sl-uuid", "level": "senior" }
    ],
    "catalog_capabilities": [
      { "id": "cap-uuid", "title": "Experiment Design", "summary": "..." },
      { "id": "cap-uuid", "title": "SEO Strategy",       "summary": "..." }
    ],
    "challenges": [],
    "created_at": "2026-04-21T...",
    "updated_at": "2026-04-21T..."
  },
  "error": null
}
```

**`POST /employer/catalog/propose/challenge`** — Bearer (employer)

Can reference an approved role **or** this employer's own pending role.

Request:
```json
{
  "catalog_role_id": "role-uuid",
  "title": "Growth Funnel Audit Challenge",
  "summary": "Audit a sample funnel and propose improvements",
  "scenario": "You have been hired as a consultant...",
  "deliverables": ["Audit report", "Prioritized recommendations"],
  "submission_format": "Google Docs link + Figma link",
  "constraints_text": "Max 15 pages",
  "submission_requirements": "Public Google Doc link",
  "rubric_criteria": [
    { "title": "Diagnostic Quality",   "description": "Depth of analysis",   "weight": 40 },
    { "title": "Recommendation Rigor", "description": "Actionable",           "weight": 35 },
    { "title": "Presentation",         "description": "Clarity and visuals", "weight": 25 }
  ]
}
```

**`rubric_criteria` weights must sum to exactly 100.** 99 will fail, 101 will fail.

Possible errors:
- `422 VALIDATION_ERROR` — weights do not sum to 100.
- `404 ROLE_NOT_FOUND` — bad `catalog_role_id`.
- `403 ROLE_NOT_OWNED` — the role belongs to another employer.
- `403 ROLE_REJECTED` — parent role was rejected.

### 9.5 Hiring wizard — create the draft request

**`POST /employer/requests`** — Bearer (employer)

**Request body (everything):**
```json
{
  "title": "Senior Product Designer",
  "role_type": "Product Designer",
  "role_level": "senior",
  "challenge_id": "ch-uuid",
  "challenge_cap": 21,
  "shortlist_size": 5,
  "deadline": "2026-06-01T00:00:00Z",
  "custom_rubric": [
    { "title": "Visual Design",     "description": "Aesthetics",   "weight": 30 },
    { "title": "UX Reasoning",      "description": "Flow logic",   "weight": 40 },
    { "title": "Prototype Quality", "description": "Execution",   "weight": 30 }
  ]
}
```

- `title` required.
- `role_type`, `role_level`, `challenge_id`, `challenge_cap`, `shortlist_size`, `deadline` all optional at draft time — the employer can save a partial draft.
- `role_level` must be `"entry-level"`, `"mid-level"`, or `"senior"`.
- `challenge_cap` default 10, range 1–500.
- `shortlist_size` default 3, range 1–50.
- `deadline` must be an ISO 8601 timestamp with timezone offset (e.g. `2026-06-01T00:00:00Z`).
- `custom_rubric` is optional. When present, weights must sum to exactly 100. This is the per-request rubric override from the Concept Note.

**Full response on success (HTTP 201):**
```json
{
  "status": "success",
  "message": "Draft request created.",
  "data": {
    "id": "req-uuid",
    "workspace_id": "ws-uuid",
    "employer_id": "user-uuid",
    "title": "Senior Product Designer",
    "role_type": "Product Designer",
    "role_level": "senior",
    "challenge_id": "ch-uuid",
    "status": "draft",
    "challenge_cap": 21,
    "shortlist_size": 5,
    "deadline": "2026-06-01T00:00:00Z",
    "admin_fee": 800000,
    "deposit_amount": 4580000,
    "final_charge": null,
    "custom_rubric": [ /* your rubric */ ],
    "snapshot_challenge": null,
    "snapshot_rubric": null,
    "published_at": null,
    "closed_at": null,
    "created_at": "2026-04-21T...",
    "updated_at": "2026-04-21T..."
  },
  "error": null
}
```

**The deposit is calculated server-side:** `800,000 + cap × 180,000` (NGN). Display a preview client-side if you want, but always trust the server value.

**Possible errors:**
- `404 WORKSPACE_NOT_FOUND` — route the user to workspace setup.
- `422 VALIDATION_ERROR` — custom_rubric weights ≠ 100, or other field issues.

### 9.6 List, get, update, close requests

**`GET /employer/requests?drafts=true|false&status=published|evaluating|shortlisted|closed`** — Bearer

Full response:
```json
{
  "status": "success",
  "message": "Requests retrieved.",
  "data": [
    {
      "id": "req-uuid",
      "title": "Senior Product Designer",
      "role_type": "Product Designer",
      "role_level": "senior",
      "status": "published",
      "challenge_cap": 21,
      "shortlist_size": 5,
      "deadline": "2026-06-01T...",
      "deposit_amount": 4580000,
      "admin_fee": 800000,
      "final_charge": null,
      "published_at": "2026-04-10T...",
      "created_at": "2026-04-08T...",
      "updated_at": "2026-04-10T...",
      "challenges": { "id": "ch-uuid", "title": "Mobile banking redesign" }
    }
  ],
  "error": null
}
```

**`GET /employer/requests/:id`** — includes submission stats:

```json
{
  "status": "success",
  "message": "Request retrieved.",
  "data": {
    "id": "req-uuid",
    "title": "...",
    "role_type": "...",
    "status": "published",
    "challenge_cap": 21,
    "shortlist_size": 5,
    "deadline": "...",
    "deposit_amount": 4580000,
    "admin_fee": 800000,
    "final_charge": null,
    "snapshot_challenge": { /* ... */ },
    "snapshot_rubric": [ /* ... */ ],
    "custom_rubric": [ /* if set */ ],
    "published_at": "...",
    "closed_at": null,
    "challenges": { /* ... */ },
    "workspaces": { "id": "...", "company_name": "..." },
    "submission_stats": {
      "total": 12,
      "submitted": 4,
      "under_review": 3,
      "returned": 1,
      "scored": 2,
      "shortlisted": 1,
      "rejected": 1
    }
  },
  "error": null
}
```

**`PATCH /employer/requests/:id`** — update a draft. Only works when `status = "draft"`.

Same body fields as create, all optional. If `challenge_cap` changes, `deposit_amount` is recalculated.

**`DELETE /employer/requests/:id`** — closes the request (sets status to `closed`). Does not delete.

### 9.7 Publish a request

**`POST /employer/requests/:id/publish`** — Bearer (employer)

No body. This is the critical moment: the rubric is snapshotted (frozen), the request moves to `published`, and a Paystack payment is initiated for the deposit.

**Full response body on success:**
```json
{
  "status": "success",
  "message": "Request published. Snapshot locked. Complete the payment to activate.",
  "data": {
    "request": {
      "id": "req-uuid",
      "status": "published",
      "snapshot_challenge": { /* frozen copy */ },
      "snapshot_rubric": [ /* the locked rubric (from custom_rubric if set, else challenge default) */ ],
      "published_at": "2026-04-21T...",
      /* ... rest of the request fields ... */
    },
    "payment": {
      "payment_reference": "H51-1713700000-ABCD1234",
      "authorization_url": "https://checkout.paystack.com/stub_H51-...",
      "access_code": "stub_access_..."
    }
  },
  "error": null
}
```

**What to do with this response:** redirect the browser to `data.payment.authorization_url`. After Paystack completes, the user returns to your callback page — call `GET /employer/payments/verify/:reference` there.

**Possible errors:**
- `400 NOT_DRAFT` — already published.
- `400 NO_CHALLENGE` — no `challenge_id` on the request (and no custom_rubric either).
- `400 RUBRIC_WEIGHT_INVALID` — custom_rubric weights do not sum to 100.

### 9.8 Employer shortlists

**`GET /employer/shortlists`** — all shortlists this employer has received.

Full response:
```json
{
  "status": "success",
  "message": "Shortlists retrieved.",
  "data": [
    {
      "id": "req-uuid",
      "title": "Senior Product Designer",
      "role_type": "...",
      "shortlist_size": 5,
      "status": "shortlisted",
      "shortlists": [
        {
          "id": "sl-uuid",
          "rank": 1,
          "total_score": 92.5,
          "confirmed_at": "2026-04-18T...",
          "delivered_at": "2026-04-18T...",
          "users": { "id": "user-uuid", "email": "...", "first_name": "Ada", "last_name": "Lovelace" },
          "submissions": {
            "id": "sub-uuid",
            "artifact_urls": ["..."],
            "submission_statement": "...",
            "reviewer_notes": "Excellent work.",
            "total_score": 92.5,
            "submission_scores": [
              { "criterion_title": "Visual Design", "weight": 30, "score_percent": 90 }
            ]
          }
        }
      ]
    }
  ],
  "error": null
}
```

**`GET /employer/shortlists/:id`** — same shape, just one.

### 9.9 Employer billing

**`GET /employer/billing`** — Bearer (employer)

Full response:
```json
{
  "status": "success",
  "message": "Billing retrieved.",
  "data": {
    "summary": { "total_spent": 5000000, "total_credit": 750000 },
    "requests": [
      { "id": "...", "title": "...", "status": "shortlisted", "deposit_amount": 4580000, "final_charge": 3820000 }
    ],
    "settlements": [
      {
        "id": "...",
        "job_request_id": "req-uuid",
        "deposit_paid": 4580000,
        "final_charge": 3820000,
        "credit_returned": 760000,
        "settled_at": "2026-04-18T..."
      }
    ],
    "payments": [
      {
        "id": "...",
        "amount": 4580000,
        "status": "success",
        "payment_reference": "H51-...",
        "paid_at": "2026-04-10T..."
      }
    ]
  },
  "error": null
}
```


---

## 10. Admin Endpoints

Admin roles, least to most powerful:
- **admin_reviewer** — triage and score submissions; view catalog and review queues.
- **admin_lead** — everything a reviewer can do, plus CRUD on catalog, approve/reject employer proposals, confirm and deliver shortlists.
- **system_admin** — everything a lead can do, plus create and deactivate admin accounts and users.

### 10.1 Admin login

**`POST /admin/auth/login`** — same body as `/auth/login`. Returns `403 WRONG_ROLE_LOGIN` if the account is not an admin role.

Default system admin (change the password immediately after first login):
- Email: `admin@hack51.com`
- Password: `Admin@Hack51!`

### 10.2 Admin dashboard

**`GET /admin/dashboard`** — Bearer (any admin)

Full response:
```json
{
  "status": "success",
  "message": "Admin dashboard loaded.",
  "data": {
    "stats": {
      "submissions_received": 245,
      "invalid_submissions": 12,
      "evaluated_submissions": 180,
      "shortlists_delivered": 42
    },
    "users": {
      "total": 523,
      "verified": 487,
      "active": 510,
      "by_role": { "candidate": 420, "employer": 95, "admin_reviewer": 5, "admin_lead": 2, "system_admin": 1 }
    },
    "requests": {
      "total": 87,
      "by_status": { "draft": 12, "published": 15, "evaluating": 8, "shortlisted": 42, "closed": 10 }
    },
    "payments": {
      "total_revenue_ngn": 125000000,
      "total_transactions": 67
    },
    "charts": {
      "evaluations_per_day": [
        { "day": "Mon", "count": 3 },
        { "day": "Tue", "count": 5 }
      ],
      "requests_overview": [
        { "label": "Requests Closed",   "value": 10 },
        { "label": "Currently Open",    "value": 15 },
        { "label": "In Evaluation",     "value": 8 },
        { "label": "Shortlisted",       "value": 42 }
      ]
    }
  },
  "error": null
}
```

### 10.3 Admin catalog — manage roles (THE FIX)

This is where the bug your frontend engineer reported was. The PUT endpoint now correctly saves skill_levels and capabilities.

**`GET /admin/catalog/roles`** — any admin. Query params:
- `?active=false` — include inactive roles.
- `?status=pending` or `?status=rejected` — filter by proposal status.

Full response:
```json
{
  "status": "success",
  "message": "Roles retrieved.",
  "data": [
    {
      "id": "role-uuid",
      "name": "Software Engineer",
      "description": "Full-stack engineer",
      "is_active": true,
      "status": "approved",
      "proposed_by": null,
      "catalog_skill_levels": [
        { "id": "sl-uuid", "level": "senior" }
      ],
      "catalog_capabilities": [
        { "id": "cap-uuid", "title": "API Design", "summary": "..." }
      ],
      "challenges": [
        { "id": "ch-uuid", "title": "API Optimization", "is_active": true, "status": "approved" }
      ],
      "created_at": "2026-01-01T...",
      "updated_at": "2026-01-01T..."
    }
  ],
  "error": null
}
```

**`GET /admin/catalog/roles/:id`** — full role detail with nested challenges and rubric criteria.

**`POST /admin/catalog/roles`** — Bearer, admin_lead+.

Request:
```json
{
  "name": "Software Engineer",
  "description": "Full-stack engineer",
  "skill_levels": ["entry-level", "mid-level", "senior"],
  "capabilities": [
    { "title": "API Design",    "summary": "Design RESTful APIs" },
    { "title": "Data Modeling", "summary": "Relational and document" }
  ]
}
```

Full response (HTTP 201):
```json
{
  "status": "success",
  "message": "Role created successfully. Role can now be accessed by employers.",
  "data": {
    "id": "role-uuid",
    "name": "Software Engineer",
    "description": "Full-stack engineer",
    "is_active": true,
    "status": "approved",
    "proposed_by": null,
    "catalog_skill_levels": [
      { "id": "sl-uuid", "level": "entry-level" },
      { "id": "sl-uuid", "level": "mid-level" },
      { "id": "sl-uuid", "level": "senior" }
    ],
    "catalog_capabilities": [
      { "id": "cap-uuid", "title": "API Design",    "summary": "..." },
      { "id": "cap-uuid", "title": "Data Modeling", "summary": "..." }
    ],
    "challenges": [],
    "created_at": "2026-04-21T...",
    "updated_at": "2026-04-21T..."
  },
  "error": null
}
```

**`PUT /admin/catalog/roles/:id` — THE BUG-FIX ENDPOINT** — Bearer, admin_lead+.

This is the one that was broken. It now accepts the same payload shape as POST, plus `is_active`.

Request:
```json
{
  "name": "Senior Software Engineer",
  "description": "Updated description",
  "is_active": true,
  "skill_levels": ["mid-level", "senior"],
  "capabilities": [
    { "id": "existing-cap-uuid", "title": "API Design", "summary": "Updated summary" },
    { "title": "System Design", "summary": "New capability (no id)" }
  ]
}
```

**Semantics to be clear about:**

| Field | Omit it | Pass `[]` | Pass items |
|---|---|---|---|
| `name`, `description`, `is_active` | untouched | N/A | updated |
| `skill_levels` | untouched | all cleared | replaces the set |
| `capabilities` | untouched | all cleared | **diff-upsert**: items with an `id` are updated, items without are inserted, and any existing capability whose id is not in the payload is **deleted** |

The capability diff-upsert is important: it means your frontend can send "the current state of the form" and the backend will figure out what to insert, update, or delete. The `id` field on existing capabilities preserves their database ID so things referencing them don't break.

Full response on success:
```json
{
  "status": "success",
  "message": "Role updated.",
  "data": {
    "id": "role-uuid",
    "name": "Senior Software Engineer",
    "description": "Updated description",
    "is_active": true,
    "status": "approved",
    "catalog_skill_levels": [
      { "id": "sl-uuid", "level": "mid-level" },
      { "id": "sl-uuid", "level": "senior" }
    ],
    "catalog_capabilities": [
      { "id": "existing-cap-uuid", "title": "API Design", "summary": "Updated summary" },
      { "id": "new-cap-uuid",       "title": "System Design", "summary": "New capability (no id)" }
    ],
    "challenges": [ /* ... */ ],
    "updated_at": "2026-04-21T..."
  },
  "error": null
}
```

**Complete Next.js example — edit role form (Server Action):**

```tsx
// app/admin/catalog/roles/[id]/edit/page.tsx
import { apiFetch } from "@/lib/api/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface Capability {
  id?: string;
  title: string;
  summary: string | null;
}
interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  catalog_skill_levels: { id: string; level: string }[];
  catalog_capabilities: Capability[];
}

async function updateRoleAction(id: string, formData: FormData) {
  "use server";

  // The capabilities list is managed client-side and serialised into a hidden input.
  const capabilitiesJson = formData.get("capabilities") as string;
  const capabilities: Capability[] = JSON.parse(capabilitiesJson);

  const payload = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    is_active: formData.get("is_active") === "on",
    skill_levels: formData.getAll("skill_levels") as string[],
    capabilities,
  };

  await apiFetch(`/admin/catalog/roles/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  revalidatePath(`/admin/catalog/roles/${id}`);
  redirect(`/admin/catalog/roles/${id}`);
}

export default async function EditRolePage({ params }: { params: { id: string } }) {
  const role = await apiFetch<Role>(`/admin/catalog/roles/${params.id}`);
  const existingLevels = role.catalog_skill_levels.map((sl) => sl.level);
  const existingCaps   = role.catalog_capabilities;

  return (
    <form action={updateRoleAction.bind(null, role.id)}>
      <label>
        Name
        <input name="name" defaultValue={role.name} required />
      </label>

      <label>
        Description
        <textarea name="description" defaultValue={role.description ?? ""} />
      </label>

      <label>
        Active <input type="checkbox" name="is_active" defaultChecked={role.is_active} />
      </label>

      <fieldset>
        <legend>Skill levels</legend>
        {["entry-level", "mid-level", "senior"].map((lvl) => (
          <label key={lvl}>
            <input type="checkbox" name="skill_levels" value={lvl} defaultChecked={existingLevels.includes(lvl)} />
            {lvl}
          </label>
        ))}
      </fieldset>

      {/* Capabilities: we need a client component for the interactive add/edit/remove UI. */}
      <CapabilitiesEditor initial={existingCaps} />

      <button type="submit">Save</button>
    </form>
  );
}
```

And the Capabilities Editor client component:

```tsx
// app/admin/catalog/roles/[id]/edit/CapabilitiesEditor.tsx
"use client";

import { useState } from "react";

interface Capability { id?: string; title: string; summary: string | null }

export function CapabilitiesEditor({ initial }: { initial: Capability[] }) {
  const [caps, setCaps] = useState<Capability[]>(initial);

  function addCap() {
    setCaps([...caps, { title: "", summary: "" }]);
  }

  function updateCap(i: number, field: "title" | "summary", value: string) {
    const copy = [...caps];
    copy[i] = { ...copy[i], [field]: value };
    setCaps(copy);
  }

  function removeCap(i: number) {
    setCaps(caps.filter((_, idx) => idx !== i));
  }

  return (
    <fieldset>
      <legend>Capabilities</legend>
      {caps.map((cap, i) => (
        <div key={cap.id ?? `new-${i}`}>
          <input value={cap.title} onChange={(e) => updateCap(i, "title", e.target.value)} placeholder="Title" />
          <input value={cap.summary ?? ""} onChange={(e) => updateCap(i, "summary", e.target.value)} placeholder="Summary" />
          <button type="button" onClick={() => removeCap(i)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={addCap}>+ Add capability</button>

      {/* Hidden input the Server Action reads. The capability list is serialised as JSON. */}
      <input type="hidden" name="capabilities" value={JSON.stringify(caps)} />
    </fieldset>
  );
}
```

**`DELETE /admin/catalog/roles/:id`** — Bearer, admin_lead+. Cascades to all associated challenges.

### 10.4 Admin catalog — manage challenges

Same CRUD pattern as roles. Key difference: `rubric_criteria` on PUT is **replace-all**, not diff-upsert.

**`POST /admin/catalog/challenges`** — Bearer, admin_lead+.

Request:
```json
{
  "catalog_role_id": "role-uuid",
  "title": "API Optimization Challenge",
  "summary": "Improve a sluggish REST API",
  "scenario": "Your team manages a backend API...",
  "deliverables": ["Source code", "README.md", "Performance report"],
  "submission_format": "Single ZIP or public GitHub link",
  "constraints_text": "Max 10 pages",
  "submission_requirements": "Public GitHub repo",
  "rubric_criteria": [
    { "title": "Code Quality",       "description": "Patterns, readability", "weight": 30 },
    { "title": "Code Technicality",  "description": "Technical depth",       "weight": 30 },
    { "title": "Code Functionality", "description": "Does it work",          "weight": 40 }
  ]
}
```

**Weights must sum to exactly 100** (422 error otherwise).

**`PUT /admin/catalog/challenges/:id`** — Bearer, admin_lead+.

Same shape, all fields optional. If you send `rubric_criteria`, **the entire rubric is replaced** (not diff-merged). Omit the field to leave rubric untouched.

### 10.5 Admin — review employer proposals (NEW)

**`GET /admin/catalog/proposals/roles`** — Bearer, admin_lead+. Pending role proposals from employers.

Full response:
```json
{
  "status": "success",
  "message": "Pending role proposals retrieved.",
  "data": [
    {
      "id": "role-uuid",
      "name": "Growth Marketing Lead",
      "description": "Drives growth strategy",
      "status": "pending",
      "proposed_by": "employer-user-uuid",
      "created_at": "2026-04-21T...",
      "catalog_skill_levels": [ /* ... */ ],
      "catalog_capabilities": [ /* ... */ ],
      "users": {
        "id": "employer-user-uuid",
        "email": "cto@startup.com",
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ],
  "error": null
}
```

**`POST /admin/catalog/proposals/roles/:id/review`** — Bearer, admin_lead+.

Request:
```json
{ "decision": "approve" }
```
or
```json
{ "decision": "reject", "reason": "Duplicate of existing role" }
```

Full response on success:
```json
{
  "status": "success",
  "message": "Role proposal approved.",
  "data": {
    "id": "role-uuid",
    "status": "approved",
    "reviewed_by": "admin-uuid",
    "reviewed_at": "2026-04-21T...",
    "reject_reason": null,
    /* ... rest of role fields ... */
  },
  "error": null
}
```

**Side effect:** the proposing employer receives an in-app notification.

**`GET /admin/catalog/proposals/challenges`** and **`POST /admin/catalog/proposals/challenges/:id/review`** work identically for challenge proposals.

### 10.6 Admin review — triage and scoring

**`GET /admin/review/requests?status=published`** — list of requests to review.

**`GET /admin/review/requests/:requestId/submissions`** — all submissions for one request.

Full response:
```json
{
  "status": "success",
  "message": "Submissions retrieved.",
  "data": {
    "stats": {
      "total": 12,
      "submitted": 4,
      "under_review": 3,
      "returned": 1,
      "scored": 2,
      "shortlisted": 1,
      "rejected": 1
    },
    "submissions": [
      {
        "id": "sub-uuid",
        "status": "scored",
        "artifact_urls": ["..."],
        "artifact_type": "link",
        "submission_statement": "...",
        "triage_decision": "valid",
        "reviewer_notes": "...",
        "total_score": 87.5,
        "submitted_at": "...",
        "updated_at": "...",
        "users": { "id": "...", "email": "...", "first_name": "...", "last_name": "...", "avatar_url": null }
      }
    ]
  },
  "error": null
}
```

**`GET /admin/review/submissions/:id`** — full submission detail including `submission_scores` breakdown.

**`POST /admin/review/submissions/:id/triage`** — Bearer, any admin.

Request:
```json
{ "decision": "valid", "reason": "All deliverables present" }
```

`decision` is one of `"valid"`, `"invalid"`, `"returned"`. On `valid`, submission moves to `under_review`. On `invalid`, it moves to `rejected`. On `returned`, the candidate can resubmit.

**Side effect:** candidate receives an in-app notification.

**`POST /admin/review/submissions/:id/score`** — Bearer, any admin.

Request:
```json
{
  "scores": [
    { "criterion_id": "cr-uuid", "criterion_title": "Code Quality",       "weight": 30, "score_percent": 85 },
    { "criterion_id": "cr-uuid", "criterion_title": "Code Technicality",  "weight": 30, "score_percent": 90 },
    { "criterion_id": "cr-uuid", "criterion_title": "Code Functionality", "weight": 40, "score_percent": 80 }
  ],
  "reviewer_notes": "Strong technical proficiency."
}
```

**`total_score`** is auto-calculated: `(30 × 85 + 30 × 90 + 40 × 80) / 100 = 84.5`.

Submission moves to `status: "scored"`.

### 10.7 Admin — shortlist management

**`GET /admin/review/shortlists`** — all requests in `evaluating` / `shortlisted` / `closed` status.

**`GET /admin/review/shortlists/:requestId/candidates`** — scored submissions ranked by `total_score` descending.

Full response:
```json
{
  "status": "success",
  "message": "Scored submissions retrieved. Select top candidates.",
  "data": [
    {
      "id": "sub-uuid",
      "total_score": 92.5,
      "status": "scored",
      "submitted_at": "...",
      "scored_at": "...",
      "users": {
        "id": "cand-uuid",
        "email": "ada@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "avatar_url": null
      },
      "submission_scores": [
        { "criterion_id": "...", "criterion_title": "Visual Design",     "weight": 30, "score_percent": 95 },
        { "criterion_id": "...", "criterion_title": "UX Reasoning",      "weight": 40, "score_percent": 90 },
        { "criterion_id": "...", "criterion_title": "Prototype Quality", "weight": 30, "score_percent": 94 }
      ]
    }
  ],
  "error": null
}
```

**`POST /admin/review/shortlists/:requestId/confirm`** — Bearer, admin_lead+.

Request:
```json
{
  "selections": [
    { "candidate_id": "cand-uuid", "submission_id": "sub-uuid", "rank": 1 },
    { "candidate_id": "cand-uuid", "submission_id": "sub-uuid", "rank": 2 },
    { "candidate_id": "cand-uuid", "submission_id": "sub-uuid", "rank": 3 }
  ]
}
```

Marks the selected submissions as `shortlisted`. Can be called multiple times before delivery — the last call wins.

**`POST /admin/review/shortlists/:requestId/deliver`** — Bearer, admin_lead+. No body.

The final commit: shortlist entries get `delivered_at`, request moves to `shortlisted`, a settlement record is created, the employer is notified.

Full response:
```json
{
  "status": "success",
  "message": "Shortlist delivered. Employer has been notified and balance automatically adjusted.",
  "data": {
    "request": { /* updated job_request with status='shortlisted' */ },
    "final_charge": 1620000,
    "credit_returned": 2960000
  },
  "error": null
}
```

### 10.8 Admin — user management (system_admin only)

**`GET /admin/users?role=candidate&search=email-fragment`**

**`PATCH /admin/users/:userId/toggle-active`** — activate/deactivate. Cannot deactivate `system_admin` accounts.

### 10.9 Admin wallet

**`GET /admin/wallet?filter=oldest|latest|successful|failed`**

Full response:
```json
{
  "status": "success",
  "message": "Wallet overview retrieved.",
  "data": {
    "totalRevenue": 125000000,
    "totalDeposits": 145000000,
    "totalCreditReturned": 20000000,
    "settlements": [ /* ... */ ],
    "payments": [ /* ... */ ],
    "transactions": [
      {
        "id": "...",
        "amount": 4580000,
        "status": "success",
        "payment_reference": "H51-...",
        "payment_type": "deposit",
        "created_at": "...",
        "paid_at": "...",
        "users": { "email": "...", "first_name": "...", "last_name": "..." },
        "job_requests": { "id": "...", "title": "..." }
      }
    ]
  },
  "error": null
}
```

---

## 11. Payments

Payments are stubbed right now. When you call `initiate`, the backend creates a payment record and returns fake Paystack URLs. When you call `verify`, it always returns success. This will change when Paystack credentials are added — no frontend code changes needed.

### 11.1 Initiate a payment

**`POST /employer/payments/initiate`** — Bearer (employer)

Request:
```json
{
  "amount_ngn": 4580000,
  "job_request_id": "req-uuid",
  "payment_type": "deposit"
}
```

Full response:
```json
{
  "status": "success",
  "message": "Payment initiated. Redirect user to authorization_url to complete payment.",
  "data": {
    "payment_reference": "H51-1713700000-ABCD1234",
    "authorization_url": "https://checkout.paystack.com/stub_H51-...",
    "access_code": "stub_access_..."
  },
  "error": null
}
```

Redirect the browser to `data.authorization_url`.

### 11.2 Verify a payment

**`GET /employer/payments/verify/:reference`** — Bearer (employer)

Full response:
```json
{
  "status": "success",
  "message": "Payment verified successfully.",
  "data": {
    "reference": "H51-1713700000-ABCD1234",
    "status": "success",
    "amount": 4580000,
    "currency": "NGN"
  },
  "error": null
}
```

### 11.3 Payment history

**`GET /employer/payments/history`** — Bearer (employer)

Full response:
```json
{
  "status": "success",
  "message": "Payment history retrieved.",
  "data": [
    {
      "id": "pay-uuid",
      "user_id": "...",
      "job_request_id": "req-uuid",
      "amount": 4580000,
      "currency": "NGN",
      "status": "success",
      "payment_reference": "H51-...",
      "paystack_id": "stub_ps_...",
      "payment_type": "deposit",
      "metadata": {},
      "paid_at": "2026-04-10T...",
      "created_at": "2026-04-10T...",
      "updated_at": "2026-04-10T..."
    }
  ],
  "error": null
}
```

### 11.4 Next.js callback page pattern

After Paystack finishes, the user lands on your callback URL. Verify the payment there:

```tsx
// app/employer/payments/callback/page.tsx
import { apiFetch } from "@/lib/api/server";
import { redirect } from "next/navigation";

interface VerifyResult {
  reference: string;
  status: "success" | "failed";
  amount: number;
  currency: string;
}

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: { reference?: string };
}) {
  if (!searchParams.reference) redirect("/employer/dashboard");

  const result = await apiFetch<VerifyResult>(
    `/employer/payments/verify/${searchParams.reference}`,
  );

  if (result.status === "success") {
    redirect(`/employer/requests?payment=success`);
  }

  return (
    <main>
      <h1>Payment verification failed</h1>
      <p>Please contact support with reference: {result.reference}</p>
    </main>
  );
}
```

### 11.5 Webhook (not called from frontend)

`POST /payments/webhook` is called by Paystack directly, using an `x-paystack-signature` header. Your frontend does not interact with this.

---

## 12. Notifications

Every role has the same notification shape and endpoints, just under a different prefix.

| Role | List | Mark read |
|---|---|---|
| Candidate | `GET /candidate/notifications` | `POST /candidate/notifications/mark-read` |
| Employer | `GET /employer/notifications` | `POST /employer/notifications/mark-read` |
| Admin | `GET /admin/notifications` | `POST /admin/notifications/mark-read` |

### 12.1 List notifications

**`GET /{role}/notifications?unread=true&limit=50`**

Full response:
```json
{
  "status": "success",
  "message": "Notifications retrieved.",
  "data": {
    "notifications": [
      {
        "id": "notif-uuid",
        "user_id": "user-uuid",
        "title": "Submission Update",
        "body": "Your submission is being evaluated. We'll notify you of the outcome.",
        "type": "info",
        "is_read": false,
        "metadata": { "job_request_id": "req-uuid" },
        "created_at": "2026-04-21T14:00:00Z"
      }
    ],
    "unread_count": 3
  },
  "error": null
}
```

`type` is one of `"info"`, `"success"`, or `"warning"`.

### 12.2 Mark as read

**`POST /{role}/notifications/mark-read`**

To mark specific notifications:
```json
{ "ids": ["notif-uuid-1", "notif-uuid-2"] }
```

To mark all unread:
```json
{}
```

Full response:
```json
{
  "status": "success",
  "message": "2 notification(s) marked as read.",
  "data": null,
  "error": null
}
```

### 12.3 Notification bell with SWR polling

```tsx
// components/NotificationBell.tsx
"use client";

import useSWR from "swr";

interface NotificationsResponse {
  status: "success" | "error";
  data: {
    notifications: unknown[];
    unread_count: number;
  };
}

const fetcher = (url: string): Promise<NotificationsResponse> =>
  fetch(url).then((r) => r.json());

export function NotificationBell({ role }: { role: "admin" | "employer" | "candidate" }) {
  const { data } = useSWR<NotificationsResponse>(
    `/api/proxy/${role}/notifications?unread=true`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const count = data?.data?.unread_count ?? 0;

  return (
    <button className="relative">
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs px-1">
          {count}
        </span>
      )}
    </button>
  );
}
```

Remember: because the proxy forwards the raw envelope, `data?.data?.unread_count` reaches through the envelope's `data` field.

---

## 13. State Diagrams

### 13.1 Job Request lifecycle

```
  ┌───────┐  POST /employer/requests     ┌───────┐
  │       │ ─────────────────────────────▶│       │
  │   ∅   │                              │ draft │
  │       │                              │       │
  └───────┘                              └───┬───┘
                                              │ POST /employer/requests/:id/publish
                                              │ (initiates Paystack payment)
                                              ▼
                                         ┌───────────┐
                                         │ published │ ◀── candidates submit to this
                                         └─────┬─────┘
                                              │ (admin begins triaging)
                                              ▼
                                         ┌────────────┐
                                         │ evaluating │
                                         └─────┬──────┘
                                              │ POST /admin/review/shortlists/:id/deliver
                                              ▼
                                         ┌──────────────┐
                                         │ shortlisted  │
                                         └──────┬───────┘
                                              │ DELETE /employer/requests/:id
                                              ▼
                                         ┌───────┐
                                         │ closed│
                                         └───────┘
```

### 13.2 Submission lifecycle

```
                    POST /candidate/challenges/:id/submit
                               │
                               ▼
                       ┌──────────────┐
                       │  submitted   │ ← initial state
                       └──────┬───────┘
                              │ POST /admin/review/submissions/:id/triage
         ┌────────────────────┼────────────────────┐
         │ decision=valid     │ decision=returned  │ decision=invalid
         ▼                    ▼                    ▼
  ┌──────────────┐    ┌──────────────┐      ┌──────────────┐
  │ under_review │    │   returned   │      │   rejected   │
  └──────┬───────┘    └──────┬───────┘      └──────────────┘
         │                    │  candidate resubmits (same endpoint)
         │                    └──────▶ back to `submitted`
         │ POST :id/score
         ▼
  ┌──────────────┐
  │    scored    │
  └──────┬───────┘
         │ admin selects for shortlist
         │ POST /admin/review/shortlists/:id/confirm
         ▼
  ┌──────────────┐
  │ shortlisted  │ ← final state; appears in employer shortlist delivery
  └──────────────┘
```

### 13.3 Catalog proposal lifecycle

```
  Employer: POST /employer/catalog/propose/role (or /challenge)
                     │
                     ▼
              ┌───────────┐
              │  pending  │ ← in admin review queue
              └─────┬─────┘
                    │ POST /admin/catalog/proposals/*/:id/review
          ┌─────────┴─────────┐
          │ decision=approve  │ decision=reject
          ▼                   ▼
    ┌──────────┐        ┌──────────┐
    │ approved │        │ rejected │
    │          │        │ (reason) │
    │ publicly │        │          │
    │ visible  │        │ hidden   │
    └──────────┘        └──────────┘
```

---

## 14. Error Code Reference

Always branch on `error.code`. Full list:

### Auth errors

| Code | HTTP | Meaning | Frontend action |
|---|---|---|---|
| `MISSING_TOKEN` | 401 | No Authorization header | Redirect to /login |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password | Show form error |
| `REFRESH_TOKEN_REUSE` | 401 | Refresh token used twice — treated as theft | **Force full logout** |
| `EMAIL_NOT_VERIFIED` | 403 | Account exists but OTP not verified | Redirect to /verify-email |
| `ACCOUNT_INACTIVE` | 403 | Account deactivated by admin | Show "contact support" |
| `WRONG_ROLE_LOGIN` | 403 | Used the wrong role-specific login | Redirect to correct login |
| `ADMIN_SELF_REGISTER_FORBIDDEN` | 403 | Tried to register as admin | Show "contact admin" |
| `FORBIDDEN` | 403 | Generic role check failed | Redirect to dashboard |
| `INSUFFICIENT_ROLE` | 403 | Authenticated but wrong role | Redirect to dashboard |
| `OTP_EXPIRED` | 400 | OTP is older than 10 minutes | Show "request new code" |
| `OTP_INVALID` | 400 | Wrong OTP code | Show "try again" |
| `EMAIL_EXISTS` | 409 | Already registered | Show "try logging in" |
| `ALREADY_VERIFIED` | 409 | Account already verified | Redirect to login |
| `USER_NOT_FOUND` | 404 | No account for this email | Generic "check your email" |
| `INVALID_RESET_TOKEN` | 401 | Reset token expired or wrong | Restart reset flow |

### Catalog and request errors

| Code | HTTP | Meaning |
|---|---|---|
| `ROLE_NOT_FOUND` | 404 | Catalog role id does not exist |
| `CHALLENGE_NOT_FOUND` | 404 | Challenge id does not exist or is not approved/active |
| `ROLE_NOT_OWNED` | 403 | Tried to attach challenge to another employer's pending role |
| `ROLE_REJECTED` | 403 | Parent role was rejected |
| `PROPOSAL_NOT_FOUND` | 404 | Trying to review a non-pending proposal |
| `WORKSPACE_NOT_FOUND` | 404 | Employer has not completed workspace setup |
| `REQUEST_NOT_FOUND` | 404 | Job request does not exist or does not belong to this employer |
| `NOT_DRAFT` | 400 | Trying to edit or publish a request that is no longer a draft |
| `NO_CHALLENGE` | 400 | Publishing a request with no challenge_id and no custom_rubric |
| `RUBRIC_WEIGHT_INVALID` | 400 | custom_rubric weights do not sum to 100 |

### Submission errors

| Code | HTTP | Meaning |
|---|---|---|
| `SUBMISSION_NOT_FOUND` | 404 | Submission id does not exist |
| `ALREADY_SUBMITTED` | 409 | Existing non-returned submission exists |
| `CHALLENGE_CLOSED` | 403 | Request is not in `published` status |
| `DEADLINE_PASSED` | 403 | Past the deadline |

### Payment errors

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_AMOUNT` | 400 | Amount missing or ≤ 0 |
| `PAYMENT_NOT_FOUND` | 404 | Reference does not exist |

### Validation

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Zod schema failed. `error.details` is a JSON string with per-field errors. Parse it with `JSON.parse()` to get an array of `{ path, message }` issues. |

---

## 15. Common Mistakes to Avoid

### 15.1 Using `response.id` instead of `response.data.id`

The backend always wraps everything in the envelope `{ status, message, data, error }`. If you are using plain `fetch`, the business data is inside `.data`.

Use `apiFetch` / `clientFetch` — they unwrap the envelope for you and throw on errors.

### 15.2 The `:id` in `/candidate/challenges/:id/submit` is the job_request id

Not the catalog challenge id. Candidates submit to the employer's published request, not to the abstract challenge template.

### 15.3 Showing the wrong rubric to candidates

When showing a candidate what they will be scored against, use the job_request's `snapshot_rubric` — this is the locked copy from publish time. Do not use `challenges.rubric_criteria` from the linked challenge. If the employer used `custom_rubric`, the snapshot reflects that, and the live challenge rubric may differ.

### 15.4 Rubric weights must sum to exactly 100

Not 99, not 101. The backend rejects anything else with HTTP 422.

When your UI lets someone edit weights, compute the sum in real time and disable the submit button until it equals 100:

```tsx
const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
<button disabled={totalWeight !== 100}>Save</button>
```

### 15.5 Do not compute the deposit client-side for submission

You can display a preview — `800,000 + cap × 180,000` in NGN — but always trust the `deposit_amount` value that the backend returns. Never send it in your request body.

### 15.6 `integrity_declared` must be the literal boolean `true`

```ts
// ✗ All of these will fail:
{ integrity_declared: "true" }  // string, not boolean
{ integrity_declared: 1 }        // number, not boolean
{ integrity_declared: false }    // not accepted

// ✓ The only accepted value:
{ integrity_declared: true }
```

### 15.7 The Figma signup form has a `company_name` field that the backend does not accept

Collect it, store it in sessionStorage, and after first login call `PATCH /employer/workspace` as part of onboarding.

### 15.8 Access tokens expire after 15 minutes

Even while the user is actively clicking around. The `apiFetch` helper handles auto-refresh. Use it — do not write direct `fetch` calls that do not handle 401.

### 15.9 Do not poll `/auth/me` on every page

Decode the JWT client-side to read the role (see the middleware in §4.5). Only call `/auth/me` when you genuinely need fresh profile data.

### 15.10 The `search` query parameter is case-insensitive substring

`?search=designer` on `/candidate/challenges` matches any title containing "designer". Do not URL-encode wildcards — the backend adds them internally.

### 15.11 Paystack is currently stubbed

Every verify returns `status: "success"` today. When Paystack is wired up for real, you will need to actually handle `status: "failed"`. Your callback page should be written with both cases in mind from day one.

### 15.12 CORS

The backend reads `CORS_ORIGINS` environment variable. Make sure your Next.js URL is listed. For local development: `CORS_ORIGINS=http://localhost:3000`. For production: your deployed domain.

### 15.13 Cookie SameSite with separate subdomains

If your Next.js app runs on `app.hack51.com` and the API on `api.hack51.com`, `sameSite: "lax"` is fine because the cookies travel with same-site top-level navigation. If they are on completely different root domains, you need `sameSite: "none"` + `secure: true` and the API must return `Access-Control-Allow-Credentials: true`.

### 15.14 A role can be `status: "approved"` but `is_active: false`

An admin may have deactivated an approved role. The employer-facing browse endpoints already filter both, but if you write custom queries, check both.

### 15.15 `total_score` is already a weighted number out of 100

When displaying scores, you can show as `87.5 / 100` or `87.5%`. Do not multiply or divide — the math is done.

---

## Appendix: Endpoint Quick Reference

### Auth (shared — work for any role)

| Method | Path | Auth |
|---|---|---|
| POST | `/auth/register` | — |
| POST | `/auth/verify-email` | — |
| POST | `/auth/resend-otp` | — |
| POST | `/auth/login` | — |
| POST | `/auth/refresh` | — |
| POST | `/auth/logout` | Bearer |
| POST | `/auth/forgot-password` | — |
| POST | `/auth/verify-reset-otp` | — |
| POST | `/auth/reset-password` | — |
| GET | `/auth/me` | Bearer |

### Admin

| Method | Path | Role |
|---|---|---|
| POST | `/admin/auth/login` | — |
| GET | `/admin/auth/me` | admin |
| POST | `/admin/auth/create` | system_admin |
| GET, PATCH | `/admin/profile` | admin |
| GET | `/admin/dashboard` | admin |
| GET | `/admin/users` | system_admin |
| PATCH | `/admin/users/:userId/toggle-active` | system_admin |
| GET, POST | `/admin/catalog/roles` | admin / lead |
| GET, PUT, DELETE | `/admin/catalog/roles/:id` | admin / lead |
| GET, POST | `/admin/catalog/challenges` | admin / lead |
| GET, PUT, DELETE | `/admin/catalog/challenges/:id` | admin / lead |
| GET | `/admin/catalog/proposals/roles` | lead |
| POST | `/admin/catalog/proposals/roles/:id/review` | lead |
| GET | `/admin/catalog/proposals/challenges` | lead |
| POST | `/admin/catalog/proposals/challenges/:id/review` | lead |
| GET | `/admin/review/requests` | admin |
| GET | `/admin/review/requests/:requestId/submissions` | admin |
| GET | `/admin/review/submissions/:id` | admin |
| POST | `/admin/review/submissions/:id/triage` | admin |
| POST | `/admin/review/submissions/:id/score` | admin |
| GET | `/admin/review/shortlists` | admin |
| GET | `/admin/review/shortlists/:requestId/candidates` | admin |
| POST | `/admin/review/shortlists/:requestId/confirm` | lead |
| POST | `/admin/review/shortlists/:requestId/deliver` | lead |
| GET | `/admin/wallet` | admin |
| GET, POST | `/admin/notifications`, `/mark-read` | admin |

### Employer

| Method | Path |
|---|---|
| POST | `/employer/auth/register` |
| POST | `/employer/auth/login` |
| GET, PATCH | `/employer/profile` |
| GET | `/employer/dashboard` |
| GET, PATCH | `/employer/workspace` |
| GET | `/employer/catalog/roles` |
| GET | `/employer/catalog/challenges` |
| GET | `/employer/catalog/challenges/:id` |
| POST | `/employer/catalog/propose/role` |
| POST | `/employer/catalog/propose/challenge` |
| GET, POST | `/employer/requests` |
| GET, PATCH, DELETE | `/employer/requests/:id` |
| POST | `/employer/requests/:id/publish` |
| GET | `/employer/shortlists` |
| GET | `/employer/shortlists/:id` |
| GET | `/employer/billing` |
| POST | `/employer/payments/initiate` |
| GET | `/employer/payments/verify/:reference` |
| GET | `/employer/payments/history` |
| GET, POST | `/employer/notifications`, `/mark-read` |

### Candidate

| Method | Path |
|---|---|
| POST | `/candidate/auth/register` |
| POST | `/candidate/auth/login` |
| GET | `/candidate/challenges` (public) |
| GET | `/candidate/challenges/:id` (public) |
| POST | `/candidate/challenges/:id/submit` |
| GET, PATCH | `/candidate/profile` |
| PATCH | `/candidate/settings` |
| GET | `/candidate/dashboard` |
| GET | `/candidate/submissions` |
| GET | `/candidate/submissions/:id` |
| GET, POST | `/candidate/notifications`, `/mark-read` |

---

**End of guide.** If anything here is unclear, open the backend's Swagger UI at `<API_BASE_URL>/docs` — it has "Try it out" for every endpoint and reflects the v1.1 changes.

