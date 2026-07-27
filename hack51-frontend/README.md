# Hack51 Frontend

Next.js 15 (App Router) frontend for Hack51 — a platform where **employers** post skill-assessment challenges for a role, **candidates** submit solutions, and **admins** review/score submissions and deliver shortlists.

Three role-based portals share one codebase: `system_admin`, `employer`, `candidate`.

## Tech stack

- **Next.js 15** (App Router, route groups) + **React 19** + **TypeScript 5.6** (strict)
- **Tailwind CSS v4** — CSS-first config (`@import "tailwindcss"` in `app/globals.css`, no `tailwind.config.js`)
- **Zustand** — global state (`userAuth` for auth, `useRequestStore` for the employer request wizard). No React Query/SWR/Redux — most pages fetch data with local `useState`/`useEffect`.
- **Axios** — shared instance with interceptors (`lib/api.ts`)
- **Supabase JS** — Storage only (signed-URL file uploads), *not* used for auth
- **Recharts** — admin dashboard/wallet charts
- **react-toastify** — notifications
- **lucide-react** — icons

## Getting started

```bash
cd hack51-frontend
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

### Environment variables

No `.env.example` exists yet — create `hack51-frontend/.env` with:

```
NEXT_PUBLIC_BASE_URL=<api base url>            # required — backend API root, used by lib/api.ts
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>     # required for candidate file uploads
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase anon key>   # required for candidate file uploads
```


## Project structure

```
app/
  layout.tsx                 # Root layout: <html>, Poppins font, ToastProvider
  page.tsx                   # "/" → redirect("/auth/login")
  globals.css                # Tailwind v4 entry point

  auth/                      # No sidebar/header — standalone auth screens
    login/, register/, logout/, forgot-password/,
    reset-password/, verify-email/, verify-reset-otp/

  components/                # Shared across all portals
    Header.tsx  Sidebar.tsx  LayoutShell.tsx  ToastProvider.tsx
    forms/*Form.tsx           # Auth forms (used by app/auth/* pages)

  (admin)/admin/              # system_admin portal
    dashboard/  catalog/{roles,challenges,rubric}/  review/  shortlists/  wallet/
    components/                # RoleCreation, ReviewTable, EvaluationDetail, ShortlistsTable, ...

  (candidate)/candidate/       # candidate portal
    dashboard/  challenges/  submissions/  profile/
    component.tsx/SubmissionTable.tsx   # note: literal dir name "component.tsx"

  (employer)/                  # employer portal (no /employer prefix — routes are top-level)
    dashboard/  requests/  shortlists/  billing/  new-request/  custom-request/
    components/{steps,customSteps}/    # request-creation wizard

lib/
  api.ts                      # Axios instance: auth header, response unwrap, 401 refresh+retry
  supabase.ts                 # Supabase client (Storage uploads only)
  globalFunction.ts           # formatDate(), badgeClasses()
  context/index.ts            # Zustand: userAuth (auth state/actions)
  context/useRequestStore.ts  # Zustand: employer new-request wizard state
  services/*.service.ts       # One file per backend resource (see below)

types/*.ts                    # Domain models: User, EmployerRequest, Challenge, Submission, Shortlist, ...
middleware.ts                 # Edge middleware: cookie-based route protection + role gating
```

## Auth flow

- **Register** (`role`: `employer` | `candidate` only — no self-serve admin signup) → email OTP → **Login** → tokens stored in **both** `localStorage` and cookies (`access_token`, `refresh_token`, `user`).
- `lib/api.ts` reads `access_token` from `localStorage` for the `Authorization` header, and silently refreshes + retries once on a 401.
- `middleware.ts` reads the `access_token` **cookie**, base64-decodes the JWT payload ( no signature/expiry verification) to get `role`, and gates routes by prefix:
  - `/admin*` → `system_admin`
  - `/candidate*` → `candidate`
  - `/dashboard`, `/requests`, `/shortlists`, `/billing`, `/new-request`, `/custom-request` → `employer`
  - Missing cookie → redirect to `/auth/login`
- `authService.getRoleRoute(role)` maps role → landing dashboard (`/admin/dashboard`, `/dashboard`, `/candidate/dashboard`) after login.
- Password reset has **two parallel implementations** — OTP-based (`/auth/verify-reset-otp`) and token-link-based (`/auth/reset-password?token=`). Confirm with backend which one the reset email actually links to before relying on either.
- All auth endpoints live in `lib/services/auth.service.ts`, hitting `/auth/*`.

## Layout composition

```
app/layout.tsx  →  <ToastProvider/> + {children}
  each route-group layout.tsx (admin/candidate/employer)
    →  <LayoutShell sidebarItems=...>{children}</LayoutShell>
         →  <Sidebar>  (role-specific nav items, active-route highlight, logout link)
         →  <Header>   (reads current user from localStorage via authService.getCurrentUser())
         →  <main>{children}</main>
```

None of the three route-group layouts perform their own role check client-side — **all route protection is in `middleware.ts`**.

## Services layer (`lib/services/`)

All go through the shared `api` axios instance, which already unwraps `response.data` — service functions then read `.data` again to reach the backend envelope (`{status, message, data, error}`).

| Service | Backend resource |
|---|---|
| `auth.service.ts` | `/auth/*` — login, register, verify-email, resend-otp, forgot/reset password, refresh, `/auth/me` |
| `catalog.service.ts` | `/admin/catalog/roles` — admin role catalog CRUD |
| `challenge.service.ts` | `/admin/catalog/challenges` (admin CRUD) + `/candidate/challenges` (candidate read) |
| `dashboard.service.ts` | `/admin/dashboard`, `/employer/dashboard`, `/candidate/dashboard` |
| `employer.service.ts` | `/employer/catalog/*` (read), `/employer/requests` (CRUD + publish), `/employer/shortlists`, `/employer/billing`, `/employer/payments/*` |
| `review.service.ts` | `/admin/review/*` — requests, submissions, triage, score, shortlists, confirm, deliver |
| `submission.service.ts` | `/candidate/submissions`, `/candidate/challenges/:id/submit` |
| `billing.service.ts` | `/billing/credits`, `/billing/transactions`, `/billing/deposit` — **defined but not called from any current UI** |
| `upload.service.ts` | `/candidate/uploads/sign` → direct-to-Supabase signed URL upload |

## Feature flows

### Employer — create a request
`app/(employer)/new-request/` is the real, working wizard (`useRequestStore` Zustand state + `StepIndicator`/`StepContent`, steps in `components/steps/`): Select Role → Skill Level → Role Details → Challenge → Challenge Detail → Rubric → Preview (edit cap/shortlist size/deadline) → Checkout → Completion. Submitting only **creates a draft** (`employerService.createRequest`); publishing happens separately from the Requests list (`RequestTable`'s Publish button → `employerService.publishRequest`).

`app/(employer)/custom-request/` (`components/customSteps/`) is a **parallel, unfinished** "define a brand-new role+challenge inline" flow — its form inputs aren't wired to any state (`onChange` missing) or API call. Treat as a stub to finish, not a working alternative.

### Admin — catalog → review → shortlist
Catalog setup is a **multi-route wizard**: Roles list → `roles/[id]/skills` → `roles/[id]/rolecapabilities` → Challenges (`catalog/challenges?catalog_role_id=`) → Challenge editor → Rubric editor (weights must total 100%). Review: `admin/review` (per-request progress) → submissions list (Evaluate auto-triages as `valid`) → `EvaluationDetail` (score per rubric criterion, weighted total computed client-side) → Shortlist candidate picker → Confirm → Deliver.

### Candidate — browse → submit
Challenges list/detail → Submit (manifest + Supabase file upload, draft cached in `sessionStorage`) → Review (3 mandatory integrity checkboxes) → `submissionService.submitArtifact`. Dashboard and Submissions list share `SubmissionTable`.

## UI Bye Passes / Work to be continued 

Flagging these so they aren't mistaken for bugs in *your* changes:

- **Employer Billing** (`billing/*`) and **Admin Wallet** page render **hardcoded mock data**, not `billingService`.
- **Candidate Profile** page is fully static — no `onChange`/save handlers.
- **`custom-request` wizard** (`customSteps/*`) — uncontrolled inputs, nothing wired up.
- **Admin "Reject submission"** (`EvaluationDetail`) and **employer "Close request"** (`requests/[id]`) show confirm UI but don't call a real API — no-ops beyond a toast/navigation, despite the modal copy implying deletion.
- **`employerService.publishRequest`**'s `payment.skip` / Paystack `authorization_url` redirect branch is not implemented in the UI (dev-mode/skip-payment path assumed).
- **`LockedListModal`** (pay-to-unlock full candidate list) has an empty `handleConfirm` stub.
- Admin charts (`EvaluationBarChart`, `RequestPieChart`) partly use hardcoded sample data rather than live dashboard data.


## Conventions to know

- `formatDate()` and `badgeClasses()` in `lib/globalFunction.ts` are the shared date/status-pill helpers used across nearly every table.
- Brand color (`#FF0046` / `#FF1F5A` / `#F01E5A`) is applied as inline Tailwind literals, not a theme token — if you touch styling broadly, consider centralizing it.
- Route groups `(admin)`, `(candidate)`, `(employer)` don't appear in the URL — e.g. employer pages live at `/dashboard`, `/requests`, not `/employer/dashboard`.
