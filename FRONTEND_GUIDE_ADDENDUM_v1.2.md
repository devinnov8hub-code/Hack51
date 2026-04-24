# Hack51 — Frontend Guide Addendum (v1.2)

> Read this **alongside** `FRONTEND_GUIDE.md`. This document only covers what changed in v1.2 — everything else stays the same.

---

## 1. What Changed

### New endpoints
- `GET /employer/requests/:id/submissions` — the missing "submissions list for one request"
- `POST /employer/requests/:id/rerun` — duplicate a previous request as a fresh draft
- `POST /employer/shortlists/:id/unlock` — pay-to-unlock the full talent list
- `GET /employer/shortlists/:id/full-list` — read full list once unlocked
- `GET /employer/shortlists/:id/export.csv` — download as CSV
- `GET /employer/billing/:id` — per-request billing breakdown
- `GET /admin/dev/otp-info/:email` — dev-only OTP inspector

### Changed endpoints
- `POST /employer/requests/:id/publish` — response now includes `payment.skip` boolean
- `POST /employer/shortlists/:id/unlock` — same `payment.skip` pattern
- `POST /auth/register`, `POST /auth/resend-otp`, `POST /auth/forgot-password` — response includes `dev_otp` when DEV_MODE is on

---

## 2. The Candidate Auth Problem — SOLVED

**The problem:** the same email cannot be both employer and candidate (database has unique email constraint), AND Resend's free tier with `onboarding@resend.dev` only delivers to your own verified inbox.

**The solution:** when `DEV_MODE=true` (default in non-production), every endpoint that generates an OTP returns the OTP **directly in the API response**. No email needed.

### How to register and verify a candidate without email

```ts
// Step 1: Register with ANY email
const registerRes = await fetch("/api/proxy/candidate/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test-candidate-1@example.com",
    password: "TestPass1!",
    role: "candidate",
    first_name: "Test",
    last_name: "Candidate",
  }),
});
const registerEnvelope = await registerRes.json();

// In dev mode the response looks like:
// {
//   status: "success",
//   message: "Account created. ...",
//   data: {
//     user: { ... },
//     dev_otp: "482913",                    ← USE THIS DIRECTLY
//     dev_note: "DEV_MODE is on — ..."
//   },
//   error: null
// }

const otp = registerEnvelope.data.dev_otp;

// Step 2: Verify immediately using that OTP
await fetch("/api/proxy/auth/verify-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test-candidate-1@example.com",
    otp,
  }),
});

// Step 3: Login normally
const loginRes = await fetch("/api/proxy/candidate/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test-candidate-1@example.com",
    password: "TestPass1!",
  }),
});
```

She can register dozens of test candidates — `test-candidate-2@example.com`, `test-candidate-3@example.com` — none of them need real emails.

### If she loses the dev_otp from the register response

`POST /auth/resend-otp` also returns `dev_otp` in dev mode:

```ts
const res = await fetch("/api/proxy/auth/resend-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "test-candidate-1@example.com" }),
});
const envelope = await res.json();
const newOtp = envelope.data.dev_otp;  // fresh code
```

### Production safety

`DEV_MODE` is **forcibly off** when `NODE_ENV=production`, regardless of any other config. The `dev_otp` field will never appear in production responses.

---

## 3. Payment Skip Mode

Publishing a request and unlocking the full talent list both go through Paystack in production, but in dev mode (`SKIP_PAYMENT=true`, default in non-production) they auto-succeed with no redirect needed.

### How to handle the publish response

```ts
const res = await fetch(`/api/proxy/employer/requests/${id}/publish`, {
  method: "POST",
});
const envelope = await res.json();
// envelope.data shape:
// {
//   request: { id, status: "published", ... },
//   payment: {
//     payment_reference: "H51-...",
//     authorization_url: "https://checkout.paystack.com/stub_...",
//     access_code: "stub_...",
//     skip: true,         ← KEY FIELD
//     status: "success"   ← already success when skip=true
//   }
// }

if (envelope.data.payment.skip) {
  // Dev mode — request is already live, go straight to success screen
  router.push(`/employer/requests/${envelope.data.request.id}?published=true`);
} else {
  // Production — redirect to Paystack checkout
  window.location.href = envelope.data.payment.authorization_url;
}
```

The same pattern applies to `POST /employer/shortlists/:id/unlock`.

---

## 4. New Endpoints — Full Examples

### 4.1 List submissions for a request

This is the endpoint your engineer reported as missing.

**`GET /employer/requests/:id/submissions`** — Bearer (employer)

Full response:
```json
{
  "status": "success",
  "message": "Submissions retrieved.",
  "data": [
    {
      "id": "sub-uuid",
      "status": "scored",
      "artifact_type": "link",
      "submitted_at": "2026-04-22T10:00:00Z",
      "updated_at": "2026-04-23T15:00:00Z",
      "triage_decision": "valid",
      "total_score": 87.5,
      "resubmit_count": 0,
      "users": {
        "id": "cand-uuid",
        "first_name": "Ada",
        "last_name": "Lovelace",
        "avatar_url": null
      }
    }
  ],
  "error": null
}
```

The artifact URLs and reviewer notes are intentionally **not** returned here — those are only available through `GET /employer/shortlists/:id` once the shortlist is delivered. This is by design: employers should not see raw submissions before review.

### 4.2 Rerun a previous request

**`POST /employer/requests/:id/rerun`** — Bearer (employer)

No body. Creates a new draft preserving everything except deadline and snapshots.

Full response:
```json
{
  "status": "success",
  "message": "New draft created from previous request. Set a deadline and publish when ready.",
  "data": {
    "id": "new-draft-uuid",
    "title": "Senior Product Designer (rerun)",
    "status": "draft",
    "challenge_id": "ch-uuid",
    "challenge_cap": 21,
    "shortlist_size": 5,
    "deadline": null,
    "custom_rubric": [ /* preserved */ ],
    "deposit_amount": 4580000,
    "admin_fee": 800000,
    "...": "..."
  },
  "error": null
}
```

### 4.3 Unlock the full talent list

**`POST /employer/shortlists/:id/unlock`** — Bearer (employer)

No body. Initiates the unlock payment.

Full response (dev mode, skip=true):
```json
{
  "status": "success",
  "message": "Full talent list unlocked (dev mode, payment skipped).",
  "data": {
    "request_id": "req-uuid",
    "amount_ngn": 240000,
    "payment": {
      "payment_reference": "H51-1713800000-XYZ",
      "authorization_url": "https://checkout.paystack.com/stub_H51-...",
      "access_code": "stub_...",
      "skip": true,
      "status": "success"
    },
    "unlocked": true
  },
  "error": null
}
```

Possible error: `400 SHORTLIST_NOT_DELIVERED` — must wait until the shortlist is actually delivered.

### 4.4 Get the full candidate list (after unlock)

**`GET /employer/shortlists/:id/full-list`** — Bearer (employer)

Returns every scored candidate, ranked by `total_score` descending — not just the top-N shortlist.

Full response:
```json
{
  "status": "success",
  "message": "Full candidate list retrieved.",
  "data": {
    "request": { "id": "req-uuid", "title": "...", "...": "..." },
    "candidates": [
      {
        "id": "sub-uuid",
        "total_score": 92.5,
        "status": "shortlisted",
        "users": { "id": "...", "email": "...", "first_name": "Ada", "last_name": "Lovelace", "avatar_url": null },
        "submission_scores": [
          { "criterion_id": "...", "criterion_title": "Visual Design", "weight": 30, "score_percent": 95 }
        ]
      }
    ]
  },
  "error": null
}
```

Possible error: `400 FULL_LIST_LOCKED` — call `/shortlists/:id/unlock` first.

### 4.5 Export shortlist as CSV

**`GET /employer/shortlists/:id/export.csv`** — Bearer (employer)

Returns `text/csv` with `Content-Disposition: attachment` — the browser downloads the file directly. Does NOT use the JSON envelope.

Trigger the download from a client component:
```tsx
"use client";
function DownloadCsvButton({ shortlistId }: { shortlistId: string }) {
  return (
    <a href={`/api/proxy/employer/shortlists/${shortlistId}/export.csv`} download>
      Export CSV
    </a>
  );
}
```

### 4.6 Per-request billing breakdown

**`GET /employer/billing/:id`** — Bearer (employer)

Returns the line items shown in Figma screen 15 right side.

Full response:
```json
{
  "status": "success",
  "message": "Billing detail retrieved.",
  "data": {
    "request": {
      "id": "req-uuid",
      "title": "Senior Product Designer",
      "status": "shortlisted",
      "challenge_cap": 21,
      "shortlist_size": 5
    },
    "line_items": {
      "admin_setup_fee": 800000,
      "prepaid_deposit": 4580000,
      "final_charge": 1620000,
      "credit_returned": 2960000,
      "full_list_unlock": 240000
    },
    "transactions": [
      {
        "id": "pay-uuid",
        "payment_reference": "H51-...",
        "payment_type": "deposit",
        "amount": 4580000,
        "status": "success",
        "paid_at": "2026-04-10T...",
        "created_at": "2026-04-10T..."
      }
    ],
    "total_paid": 4820000,
    "settlement": {
      "id": "...",
      "deposit_paid": 4580000,
      "final_charge": 1620000,
      "credit_returned": 2960000,
      "settled_at": "..."
    }
  },
  "error": null
}
```

`null` values mean that step has not happened yet (e.g. `final_charge: null` means the shortlist hasn't been delivered).

---

## 5. Pricing — Where to Change It

All prices live in **one file**: `src/config/constants.ts` on the backend. To change:

| Price | Default | Override env var |
|---|---|---|
| Admin setup fee | ₦800,000 | `ADMIN_FEE_NGN` |
| Per-submission unit price | ₦180,000 | `UNIT_PRICE_NGN` |
| Full list unlock | ₦240,000 | `FULL_LIST_UNLOCK_NGN` |

Frontend should display the deposit using the value the backend returns in `data.deposit_amount` after creating the draft. Don't hard-code the formula on the frontend; the backend is the source of truth.

For the wizard's "Request Preview" / "Checkout" step (Figma screen 8), call `GET /employer/requests/:id` after creation and read:
- `admin_fee` for the line item
- `deposit_amount - admin_fee` for the per-candidate cost
- `deposit_amount` for the total

---

## 6. Quick Reference — Endpoint Status

| Endpoint | Status |
|---|---|
| `GET /employer/requests/:id/submissions` | NEW |
| `POST /employer/requests/:id/rerun` | NEW |
| `POST /employer/shortlists/:id/unlock` | NEW |
| `GET /employer/shortlists/:id/full-list` | NEW |
| `GET /employer/shortlists/:id/export.csv` | NEW |
| `GET /employer/billing/:id` | NEW |
| `GET /admin/dev/otp-info/:email` | NEW (dev-only) |
| `POST /employer/requests/:id/publish` | CHANGED — adds `payment.skip` |
| `POST /auth/register` | CHANGED — adds `dev_otp` in dev mode |
| `POST /auth/resend-otp` | CHANGED — adds `dev_otp` in dev mode |
| `POST /auth/forgot-password` | CHANGED — adds `dev_otp` in dev mode |
| Everything else | UNCHANGED — keep using as before |

---


