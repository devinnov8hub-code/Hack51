# Hack51 Backend API

Evidence-Based Hiring Platform — Node.js + Hono + Supabase + Resend

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 | Vercel-compatible, ESM support |
| Framework | Hono | Lightweight, edge-ready, type-safe |
| Database | Supabase (PostgreSQL) | Managed Postgres, RLS, no ORM overhead |
| Email | Resend | Free tier for dev, reliable delivery |
| Auth | JWT (jsonwebtoken) | Separate access + refresh secrets, rotation |
| Validation | Zod | Schema-first, type-safe request validation |
| Docs | Swagger UI | Auto-generated at `/docs` |

---

## Project Structure

\`\`\`
src/
├── config/          # supabase.ts, swagger.ts
├── controllers/     # auth, admin, employer, candidate
├── docs/            # auth.docs.ts, admin.docs.ts, employer.docs.ts, candidate.docs.ts
├── dto/             # Zod schemas + inferred TypeScript types
├── enumerations/    # UserRole, OtpPurpose
├── exceptions/      # AppError base + typed HTTP errors
├── middleware/      # error-handler, auth, rate-limit, validate
├── migrations/      # 001_initial_schema.sql (run once in Supabase)
├── repositories/    # user, otp, refresh-token, candidate, employer
├── routes/          # auth, admin, employer, candidate
├── services/        # auth.service.ts, email.service.ts
├── types/           # api-response.ts (global response envelope)
└── utils/           # jwt.ts, hash.ts, otp.ts, env.ts
\`\`\`

---

## Setup

### 1. Clone & install

\`\`\`bash
npm install
cp .env.example .env
\`\`\`

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Paste and run `src/migrations/001_initial_schema.sql`
4. Copy your project URL and service role key into `.env`

### 3. Set up Resend

1. Create an account at [resend.com](https://resend.com)
2. Create an API key (free tier works)
3. Use `onboarding@resend.dev` as the sender while on free tier (no domain needed)
4. Copy the API key into `.env`

### 4. Configure environment

\`\`\`env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
JWT_ACCESS_SECRET=at-least-32-random-chars
JWT_REFRESH_SECRET=different-at-least-32-random-chars
\`\`\`

### 5. Run locally

\`\`\`bash
npm run dev
# API:     http://localhost:3000
# Swagger: http://localhost:3000/docs
\`\`\`

---

## Deploy to Vercel

\`\`\`bash
vercel deploy
\`\`\`

Set all environment variables in Vercel dashboard under **Settings → Environment Variables**.

---

## API Response Format

Every endpoint returns this consistent envelope:

\`\`\`json
{
  "status": "success | error",
  "message": "Human-readable description",
  "data": {},
  "error": null
}
\`\`\`

**Success example:**
\`\`\`json
{
  "status": "success",
  "message": "Login successful.",
  "data": {
    "access_token": "eyJhbGci...",
    "refresh_token": "eyJhbGci...",
    "user": { "id": "uuid", "email": "user@example.com", "role": "candidate" }
  },
  "error": null
}
\`\`\`

**Error example:**
\`\`\`json
{
  "status": "error",
  "message": "Invalid verification code",
  "data": null,
  "error": { "code": "OTP_INVALID", "details": "..." }
}
\`\`\`

---

## Auth Flows

### Shared (all roles)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register (candidate or employer) |
| POST | `/auth/verify-email` | Verify 6-digit OTP |
| POST | `/auth/resend-otp` | Resend verification OTP |
| POST | `/auth/login` | Login (any role) |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/forgot-password` | Request password reset OTP |
| POST | `/auth/verify-reset-otp` | Verify reset OTP → get reset_token |
| POST | `/auth/reset-password` | Set new password with reset_token |
| GET  | `/auth/me` | Get current user (requires Bearer) |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/auth/login` | Admin-only login |
| POST | `/admin/auth/create` | Create admin account (SYSTEM_ADMIN only) |
| GET  | `/admin/auth/me` | Admin profile |

### Employer

| Method | Endpoint | Description |
|---|---|---|
| POST | `/employer/auth/register` | Register as employer |
| POST | `/employer/auth/login` | Employer-only login |
| GET  | `/employer/workspace` | Get workspace |
| PATCH | `/employer/workspace` | Update workspace details |

### Candidate

| Method | Endpoint | Description |
|---|---|---|
| POST | `/candidate/auth/register` | Register as candidate |
| POST | `/candidate/auth/login` | Candidate-only login |
| GET  | `/candidate/profile` | Get candidate profile |
| PATCH | `/candidate/profile` | Update candidate profile |

---

## Security Architecture

- **Passwords**: bcrypt with 12 rounds (configurable via `BCRYPT_ROUNDS`)
- **OTPs**: SHA-256 hashed before storage, constant-time comparison, 10-minute TTL, single-use
- **JWT Access**: HS256, 15-minute expiry, signed with `JWT_ACCESS_SECRET`
- **JWT Refresh**: HS256, 30-day expiry, signed with separate `JWT_REFRESH_SECRET`, stored as SHA-256 hash in DB
- **Token rotation**: Each refresh revokes the old token; reuse of a revoked token revokes ALL user sessions (theft detection)
- **Rate limiting**: 10 req/min on auth, 5 req/5min on OTP, 3 req/10min on sensitive ops
- **Email enumeration prevention**: `forgot-password` always returns 200 regardless of whether email exists
- **Role isolation**: Admin accounts cannot be self-registered; each login endpoint validates the expected role
- **New sign-in detection**: Email alert sent on first login or IP address change

---

## Email Notifications

All emails are sent via Resend:

| Trigger | Email sent |
|---|---|
| Registration | 6-digit OTP for email verification |
| OTP verified | Welcome email |
| Login from new IP | Security alert with IP + timestamp |
| Forgot password | 6-digit reset OTP |
| Password changed | Confirmation notification |
| Admin account created | Initial password reset OTP |
