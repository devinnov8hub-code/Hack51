# Admin Review Flow — Complete Implementation Guide

>
```
1. List requests in the queue          → GET  /admin/review/requests
2. Pick one, see its submissions       → GET  /admin/review/requests/{requestId}/submissions
3. Open one submission's full detail   → GET  /admin/review/submissions/{id}
4. Triage it (valid / invalid / returned) → POST /admin/review/submissions/{id}/triage
5. If valid, score it                  → POST /admin/review/submissions/{id}/score
6. Repeat 3-5 for every submission
7. List scored candidates ranked       → GET  /admin/review/shortlists/{requestId}/candidates
8. Confirm the top-N shortlist         → POST /admin/review/shortlists/{requestId}/confirm
9. Deliver to the employer             → POST /admin/review/shortlists/{requestId}/deliver
```

Two helper endpoints:

```
GET /admin/review/shortlists           — list of all requests in shortlist queue
```

---

## The most important rule

**Every endpoint that takes an ID needs the right kind of ID.** They look the same (UUIDs) but they're not interchangeable.

| What the URL says | What it actually wants |
|---|---|
| `{requestId}` | `id` of a row in the `job_requests` table — get it from `GET /admin/review/requests` |
| Submission `{id}` | `id` of a row in the `submissions` table — get it from `GET /admin/review/requests/{requestId}/submissions` (look for `submissions[].id`) |
| `candidate_id` (in body) | `id` of a row in the `users` table — get it from the candidate listing endpoints (`users.id` field) |
| `submission_id` (in body) | Same submission `id` as above |
| `criterion_id` (in body) | `id` from a row in the request's `snapshot_rubric` array — get it from `GET /admin/review/submissions/{id}` |

If you mix these up, you get a 404 because the ID doesn't exist in the table the endpoint is looking at. Always trace back to where the ID came from.

---

## Step-by-step: Swagger testing first

The exact same test data from your last test session, walked through end to end. Use this to verify the backend works before wiring up Next.js.

### Authorize once at the top

1. Open `https://hack51.vercel.app/docs`
2. Login first via `POST /admin/auth/login` with `admin@hack51.com` / `Admin@Hack51!`
3. Copy the `access_token` from the response's `data.access_token`
4. Click the **🔓 Authorize** button at the top right of Swagger
5. Paste the token (no "Bearer " prefix, just the token)
6. Click **Authorize → Close**

Now every "Try it out" call sends the right header automatically.

### Step 1 — List the queue

Endpoint: `GET /admin/review/requests`

No parameters. Click Execute. You'll see something like:

```json
{
  "status": "success",
  "data": [
    {
      "id": "31728e27-2216-4b90-9503-8a4273088a8b",
      "title": "Farm Manager",
      "status": "published",
      ...
    }
  ]
}
```

**Copy the `id`** of whichever request you want to review. We'll call this `REQUEST_ID` from now on.

### Step 2 — See submissions for that request

Endpoint: `GET /admin/review/requests/{requestId}/submissions`

Paste `REQUEST_ID` into the `requestId` field. Execute. You'll see:

```json
{
  "data": {
    "stats": { "total": 1, "scored": 1, ... },
    "submissions": [
      {
        "id": "1d7bbb9d-86ce-4981-a475-21923dc5062b",
        "status": "scored",
        "users": {
          "id": "0eca9fa6-e4ec-429b-add8-c564c1a8431c",
          "first_name": "Haruna",
          ...
        }
      }
    ]
  }
}
```

**Copy two things:**
- `submissions[].id` → this is `SUBMISSION_ID`
- `submissions[].users.id` → this is `CANDIDATE_ID`

### Step 3 — Get full submission detail

Endpoint: `GET /admin/review/submissions/{id}`

Paste `SUBMISSION_ID` (NOT the request id — that's the mistake from your last test). Execute.

You'll get the full submission including `job_requests.snapshot_rubric` — copy out each `criterion_id` from there for the score step.

### Step 4 — Triage

Endpoint: `POST /admin/review/submissions/{id}/triage`

Paste `SUBMISSION_ID` into `id`. Body:

```json
{
  "decision": "valid",
  "reason": "All deliverables present"
}
```

`decision` must be exactly one of `"valid"`, `"invalid"`, or `"returned"`.

After this:
- `valid` → submission moves to `under_review`, ready for scoring
- `invalid` → submission moves to `rejected`, candidate notified
- `returned` → submission moves to `returned`, candidate can resubmit

### Step 5 — Score

Endpoint: `POST /admin/review/submissions/{id}/score`

Paste `SUBMISSION_ID` into `id`. Body must use **real `criterion_id` UUIDs** from the snapshot_rubric you saw in step 3:

```json
{
  "scores": [
    {
      "criterion_id": "REAL-UUID-FROM-SNAPSHOT-RUBRIC",
      "criterion_title": "Soil Texture Test",
      "weight": 50,
      "score_percent": 80
    },
    {
      "criterion_id": "ANOTHER-REAL-UUID",
      "criterion_title": "Soil Humidity Test",
      "weight": 25,
      "score_percent": 40
    },
    {
      "criterion_id": "THIRD-REAL-UUID",
      "criterion_title": "Soil Color",
      "weight": 25,
      "score_percent": 20
    }
  ],
  "reviewer_notes": "Strong submission overall."
}
```

The backend computes `total_score = Σ(weight × score_percent / 100)` automatically. The submission moves to `scored`.

### Step 6 — Repeat 3–5 for every other submission in the request

Each submission needs its own triage and score before it can be shortlisted.

### Step 7 — List scored candidates ranked

Endpoint: `GET /admin/review/shortlists/{requestId}/candidates`

Paste `REQUEST_ID`. Execute. You'll see:

```json
{
  "data": [
    {
      "id": "1d7bbb9d-86ce-4981-a475-21923dc5062b",
      "total_score": 55,
      "users": {
        "id": "0eca9fa6-e4ec-429b-add8-c564c1a8431c",
        "first_name": "Haruna"
      },
      "submission_scores": [...]
    }
  ]
}
```

This is the candidate pool, ranked by `total_score` descending. Pick whichever ones you want for the shortlist.

### Step 8 — Confirm shortlist

Endpoint: `POST /admin/review/shortlists/{requestId}/confirm`

Paste `REQUEST_ID`. **Do not use the example UUIDs in the Swagger example body** — those are placeholders that don't exist in the database. Use the real `users.id` for `candidate_id` and the real submission `id` for `submission_id`, both from step 7's response:

```json
{
  "selections": [
    {
      "candidate_id": "0eca9fa6-e4ec-429b-add8-c564c1a8431c",
      "submission_id": "1d7bbb9d-86ce-4981-a475-21923dc5062b",
      "rank": 1
    }
  ]
}
```

You can include up to `shortlist_size` candidates (set when the request was created). `rank` is 1-indexed and should be unique.

This step is **idempotent** — call it as many times as you want before delivering. Last call wins. The selected submissions get marked `shortlisted`; deselected ones revert to `scored`.

### Step 9 — Deliver

Endpoint: `POST /admin/review/shortlists/{requestId}/deliver`

Paste `REQUEST_ID`. No body. Execute.

This is **one-shot** — once delivered, you cannot deliver again for the same request. The response includes:

```json
{
  "data": {
    "request": { ..., "status": "shortlisted" },
    "final_charge": 980000,
    "credit_returned": 17820000
  }
}
```

The employer gets an in-app notification, the request status moves to `shortlisted`, and a settlement record is created.

---

## Common errors and what they mean

| HTTP | Code | Cause | Fix |
|---|---|---|---|
| 400 | `EMPTY_SHORTLIST` | `selections` array was empty | Add at least one selection |
| 400 | `NO_CONFIRMED_SHORTLIST` | Tried to deliver without confirming first | Call `/confirm` with real selections, then `/deliver` |
| 400 | `ALREADY_DELIVERED` | Tried to deliver twice | Each request can only be delivered once |
| 400 | `SUBMISSION_REQUEST_MISMATCH` | The `submission_id` doesn't belong to this request | Get the right submission from the right request |
| 400 | `CANDIDATE_SUBMISSION_MISMATCH` | The `candidate_id` doesn't match the submission's owner | Use the `users.id` returned alongside that submission |
| 400 | `SUBMISSION_NOT_SCORED` | Trying to shortlist a submission that hasn't been scored yet | Triage and score it first |
| 404 | `REQUEST_NOT_FOUND` | Bad request ID | Get a real one from `GET /admin/review/requests` |
| 404 | `SUBMISSION_NOT_FOUND` | Bad submission ID | Get a real one from the submissions endpoint |
| 422 | `VALIDATION_ERROR` | Body shape wrong (missing fields, bad types, weights not summing to 100, etc.) | Read `error.details` for the specific field |
| 403 | `INSUFFICIENT_ROLE` | `admin_reviewer` tried to confirm or deliver | Use `admin_lead` or `system_admin` |

---

## Next.js implementation

This section assumes you have the `apiFetch` helper from the FRONTEND_GUIDE.md. Quick recap:

```ts
// Server-side: returns just data field, throws ApiError on failure
import { apiFetch, ApiError } from "@/lib/api/server";

// Client-side: same idea but calls through your /api/proxy route
import { clientFetch, ApiError } from "@/lib/api/client";
```

### TypeScript types — define these once

Put these in `lib/types/review.ts`:

```ts
// ─── Shared ──────────────────────────────────────────────────────────────
export type SubmissionStatus =
  | "submitted" | "under_review" | "returned"
  | "scored" | "shortlisted" | "rejected";

export type RequestStatus =
  | "draft" | "published" | "evaluating" | "shortlisted" | "closed";

export interface CandidateLite {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

// ─── Step 1: queue ───────────────────────────────────────────────────────
export interface ReviewRequest {
  id: string;
  title: string;
  role_type: string;
  role_level: "entry-level" | "mid-level" | "senior";
  status: RequestStatus;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string | null;
  deposit_amount: number;
  published_at: string;
  created_at: string;
  users: { email: string; first_name: string; last_name: string };
  workspaces: { company_name: string | null };
}

// ─── Step 2: submissions for a request ───────────────────────────────────
export interface SubmissionStats {
  total: number;
  submitted: number;
  under_review: number;
  returned: number;
  scored: number;
  shortlisted: number;
  rejected: number;
}

export interface ReviewSubmission {
  id: string;
  status: SubmissionStatus;
  artifact_urls: string[];
  artifact_type: "link" | "upload" | "both";
  submission_statement: string | null;
  triage_decision: "valid" | "invalid" | "returned" | null;
  triage_reason: string | null;
  reviewer_notes: string | null;
  total_score: number | null;
  submitted_at: string;
  updated_at: string;
  users: CandidateLite;
}

export interface RequestSubmissionsResponse {
  stats: SubmissionStats;
  submissions: ReviewSubmission[];
}

// ─── Step 3: full submission detail ──────────────────────────────────────
export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  weight: number;
  sort_order: number;
}

export interface SubmissionScore {
  id: string;
  criterion_id: string;
  criterion_title: string;
  weight: number;
  score_percent: number;
}

export interface SubmissionDetail extends ReviewSubmission {
  triaged_at: string | null;
  scored_at: string | null;
  resubmit_count: number;
  job_requests: {
    id: string;
    title: string;
    snapshot_challenge: unknown;
    snapshot_rubric: RubricCriterion[];
  };
  submission_scores: SubmissionScore[];
}

// ─── Step 7: scored candidates pool ──────────────────────────────────────
export interface RankedCandidate {
  id: string;                    // submission id
  total_score: number;
  status: SubmissionStatus;
  submitted_at: string;
  scored_at: string;
  users: CandidateLite;
  submission_scores: SubmissionScore[];
}

// ─── Step 8: confirm body ────────────────────────────────────────────────
export interface ShortlistSelection {
  candidate_id: string;          // = users.id from RankedCandidate
  submission_id: string;         // = id from RankedCandidate
  rank: number;                   // 1-indexed
}

export interface ConfirmShortlistBody {
  selections: ShortlistSelection[];
}

// ─── Step 9: deliver response ────────────────────────────────────────────
export interface DeliverShortlistResponse {
  request: ReviewRequest & { status: "shortlisted" };
  final_charge: number;
  credit_returned: number;
}

// ─── Triage + score bodies ───────────────────────────────────────────────
export interface TriageBody {
  decision: "valid" | "invalid" | "returned";
  reason?: string;
}

export interface ScoreItem {
  criterion_id: string;
  criterion_title: string;
  weight: number;          // 1–100
  score_percent: number;   // 0–100
}

export interface ScoreBody {
  scores: ScoreItem[];     // weights should sum to 100
  reviewer_notes?: string;
}
```

### Step 1 — Review queue page (Server Component)

```tsx
// app/admin/review/page.tsx
import Link from "next/link";
import { apiFetch } from "@/lib/api/server";
import type { ReviewRequest } from "@/lib/types/review";

export default async function AdminReviewQueuePage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const path = searchParams.status
    ? `/admin/review/requests?status=${searchParams.status}`
    : "/admin/review/requests";
  const requests = await apiFetch<ReviewRequest[]>(path);

  return (
    <main>
      <h1>Review Queue</h1>
      <nav>
        <Link href="?status=published">Accepting submissions</Link>{" "}
        <Link href="?status=evaluating">Evaluating</Link>{" "}
        <Link href="?status=shortlisted">Delivered</Link>
      </nav>

      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Role</th>
            <th>Status</th>
            <th>Deadline</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.role_level}</td>
              <td>{r.status}</td>
              <td>{r.deadline?.slice(0, 10)}</td>
              <td>
                <Link href={`/admin/review/${r.id}`}>Open</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
```

### Step 2 — Submissions list for one request

```tsx
// app/admin/review/[requestId]/page.tsx
import Link from "next/link";
import { apiFetch } from "@/lib/api/server";
import type { RequestSubmissionsResponse } from "@/lib/types/review";

export default async function RequestReviewPage({
  params,
}: {
  params: { requestId: string };
}) {
  const { stats, submissions } = await apiFetch<RequestSubmissionsResponse>(
    `/admin/review/requests/${params.requestId}/submissions`,
  );

  return (
    <main>
      <h1>Submissions</h1>
      <p>
        Total: {stats.total} · Scored: {stats.scored} ·
        Shortlisted: {stats.shortlisted} · Rejected: {stats.rejected}
      </p>

      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Status</th>
            <th>Score</th>
            <th>Submitted</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id}>
              <td>{s.users.first_name} {s.users.last_name}</td>
              <td>{s.status}</td>
              <td>{s.total_score ?? "—"}</td>
              <td>{new Date(s.submitted_at).toLocaleDateString()}</td>
              <td>
                {/* Note: pass submission id, NOT request id */}
                <Link href={`/admin/review/submission/${s.id}`}>Review</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Once everyone is scored, show the shortlist confirm button */}
      {stats.scored + stats.shortlisted > 0 && (
        <Link href={`/admin/review/${params.requestId}/shortlist`}>
          Pick shortlist →
        </Link>
      )}
    </main>
  );
}
```

### Steps 3, 4, 5 — Submission detail with triage + score

This is the most interactive page. Server component fetches the data, client components handle the actions.

```tsx
// app/admin/review/submission/[id]/page.tsx
import { apiFetch } from "@/lib/api/server";
import type { SubmissionDetail } from "@/lib/types/review";
import { TriageActions } from "./TriageActions";
import { ScoreForm } from "./ScoreForm";

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const submission = await apiFetch<SubmissionDetail>(
    `/admin/review/submissions/${params.id}`,
  );

  return (
    <main>
      <h1>
        {submission.users.first_name} {submission.users.last_name} —{" "}
        {submission.job_requests.title}
      </h1>
      <p>Status: {submission.status}</p>

      <section>
        <h2>Artifacts</h2>
        <ul>
          {submission.artifact_urls.map((url, i) => (
            <li key={i}>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
        {submission.submission_statement && (
          <blockquote>{submission.submission_statement}</blockquote>
        )}
      </section>

      {/* Triage — show only if not yet triaged or returned */}
      {(submission.status === "submitted" ||
        submission.status === "returned") && (
        <TriageActions submissionId={submission.id} />
      )}

      {/* Score — show only after triage marked it valid */}
      {(submission.status === "under_review" ||
        submission.status === "scored" ||
        submission.status === "shortlisted") && (
        <ScoreForm
          submissionId={submission.id}
          rubric={submission.job_requests.snapshot_rubric}
          existingScores={submission.submission_scores}
          existingNotes={submission.reviewer_notes ?? ""}
        />
      )}
    </main>
  );
}
```

#### Triage actions (Client Component)

```tsx
// app/admin/review/submission/[id]/TriageActions.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";
import type { TriageBody } from "@/lib/types/review";

export function TriageActions({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function decide(decision: TriageBody["decision"]) {
    if ((decision === "invalid" || decision === "returned") && !reason.trim()) {
      setErr("Reason is required when rejecting or returning.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await clientFetch(`/admin/review/submissions/${submissionId}/triage`, {
        method: "POST",
        body: JSON.stringify({ decision, reason: reason || undefined }),
      });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) setErr(e.message);
      else setErr("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Triage</h2>
      <textarea
        placeholder="Reason (required for invalid/returned)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />
      <div>
        <button onClick={() => decide("valid")} disabled={busy}>
          Mark valid
        </button>
        <button onClick={() => decide("returned")} disabled={busy}>
          Return for revision
        </button>
        <button onClick={() => decide("invalid")} disabled={busy}>
          Reject
        </button>
      </div>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </section>
  );
}
```

#### Score form (Client Component)

```tsx
// app/admin/review/submission/[id]/ScoreForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";
import type {
  RubricCriterion,
  ScoreItem,
  SubmissionScore,
} from "@/lib/types/review";

export function ScoreForm({
  submissionId,
  rubric,
  existingScores,
  existingNotes,
}: {
  submissionId: string;
  rubric: RubricCriterion[];
  existingScores: SubmissionScore[];
  existingNotes: string;
}) {
  const router = useRouter();
  // Pre-populate from existing scores if the admin is re-scoring
  const initial = rubric.map((c): ScoreItem => {
    const prev = existingScores.find((s) => s.criterion_id === c.id);
    return {
      criterion_id: c.id,
      criterion_title: c.title,
      weight: c.weight,
      score_percent: prev?.score_percent ?? 0,
    };
  });

  const [scores, setScores] = useState<ScoreItem[]>(initial);
  const [notes, setNotes] = useState(existingNotes);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Live preview of total score using the same formula as the backend
  const total = scores.reduce(
    (sum, s) => sum + (s.weight * s.score_percent) / 100,
    0,
  );

  function updateScore(criterion_id: string, score_percent: number) {
    setScores((prev) =>
      prev.map((s) =>
        s.criterion_id === criterion_id
          ? { ...s, score_percent: Math.max(0, Math.min(100, score_percent)) }
          : s,
      ),
    );
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await clientFetch(`/admin/review/submissions/${submissionId}/score`, {
        method: "POST",
        body: JSON.stringify({
          scores,
          reviewer_notes: notes || undefined,
        }),
      });
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) setErr(e.message);
      else setErr("Failed to save score.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Score (Total: {total.toFixed(2)} / 100)</h2>
      {scores.map((s) => (
        <div key={s.criterion_id}>
          <label>
            {s.criterion_title} (weight {s.weight})
            <input
              type="number"
              min={0}
              max={100}
              value={s.score_percent}
              onChange={(e) =>
                updateScore(s.criterion_id, Number(e.target.value))
              }
            />
            %
          </label>
        </div>
      ))}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Reviewer notes (shown to candidate and employer)"
        rows={4}
      />
      <button onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save score"}
      </button>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </section>
  );
}
```

### Steps 7, 8 — Pick + confirm shortlist

```tsx
// app/admin/review/[requestId]/shortlist/page.tsx
import { apiFetch } from "@/lib/api/server";
import type { RankedCandidate, ReviewRequest } from "@/lib/types/review";
import { ShortlistPicker } from "./ShortlistPicker";

export default async function ShortlistPage({
  params,
}: {
  params: { requestId: string };
}) {
  // Fetch both the request (for the shortlist_size cap) and the candidates
  const [request, candidates] = await Promise.all([
    apiFetch<ReviewRequest>(`/employer/requests/${params.requestId}`).catch(
      () => null,
    ),
    apiFetch<RankedCandidate[]>(
      `/admin/review/shortlists/${params.requestId}/candidates`,
    ),
  ]);

  return (
    <main>
      <h1>Pick the top candidates</h1>
      <p>
        Max shortlist size: {request?.shortlist_size ?? "—"}
      </p>
      <ShortlistPicker
        requestId={params.requestId}
        candidates={candidates}
        maxSize={request?.shortlist_size ?? 5}
      />
    </main>
  );
}
```

```tsx
// app/admin/review/[requestId]/shortlist/ShortlistPicker.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";
import type {
  RankedCandidate,
  ConfirmShortlistBody,
  ShortlistSelection,
} from "@/lib/types/review";

export function ShortlistPicker({
  requestId,
  candidates,
  maxSize,
}: {
  requestId: string;
  candidates: RankedCandidate[];
  maxSize: number;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]); // submission_ids in rank order
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(submissionId: string) {
    setPicked((prev) => {
      if (prev.includes(submissionId)) {
        return prev.filter((id) => id !== submissionId);
      }
      if (prev.length >= maxSize) {
        setErr(`You can only pick up to ${maxSize} candidates.`);
        return prev;
      }
      return [...prev, submissionId];
    });
    setErr(null);
  }

  async function confirm() {
    if (picked.length === 0) {
      setErr("Pick at least one candidate.");
      return;
    }
    setBusy(true);
    setErr(null);

    // Build the selections array — rank is 1-indexed in the order we picked
    const selections: ShortlistSelection[] = picked.map((submissionId, idx) => {
      const cand = candidates.find((c) => c.id === submissionId)!;
      return {
        candidate_id: cand.users.id,        // ← users.id, NOT a UUID we made up
        submission_id: cand.id,             // ← submission's own id
        rank: idx + 1,
      };
    });

    const body: ConfirmShortlistBody = { selections };

    try {
      await clientFetch(
        `/admin/review/shortlists/${requestId}/confirm`,
        { method: "POST", body: JSON.stringify(body) },
      );
      router.refresh();
      router.push(`/admin/review/${requestId}/deliver`);
    } catch (e) {
      if (e instanceof ApiError) {
        // Specific error handling
        switch (e.code) {
          case "EMPTY_SHORTLIST":
            setErr("You need to pick at least one candidate.");
            break;
          case "SUBMISSION_NOT_SCORED":
            setErr("One of the picked submissions is not scored yet. Refresh and try again.");
            break;
          case "SUBMISSION_REQUEST_MISMATCH":
          case "CANDIDATE_SUBMISSION_MISMATCH":
            setErr("Data mismatch — please refresh the page.");
            break;
          default:
            setErr(e.message);
        }
      } else {
        setErr("Failed to confirm shortlist.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ol>
        {candidates.map((c) => {
          const rank = picked.indexOf(c.id);
          const isPicked = rank !== -1;
          return (
            <li key={c.id}>
              <label>
                <input
                  type="checkbox"
                  checked={isPicked}
                  onChange={() => toggle(c.id)}
                />
                {isPicked && <strong>#{rank + 1}</strong>}{" "}
                {c.users.first_name} {c.users.last_name} —{" "}
                Score: {c.total_score}
              </label>
            </li>
          );
        })}
      </ol>

      <button onClick={confirm} disabled={busy || picked.length === 0}>
        {busy ? "Confirming…" : `Confirm ${picked.length} candidate${picked.length === 1 ? "" : "s"}`}
      </button>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}
```

### Step 9 — Deliver page

The deliver action is irreversible — give the admin one last preview before pulling the trigger.

```tsx
// app/admin/review/[requestId]/deliver/page.tsx
import { apiFetch } from "@/lib/api/server";
import type { ReviewRequest } from "@/lib/types/review";
import { DeliverButton } from "./DeliverButton";

export default async function DeliverPage({
  params,
}: {
  params: { requestId: string };
}) {
  // Get the request so we can show what's about to go to the employer
  const request = await apiFetch<ReviewRequest & { submission_stats: any }>(
    `/employer/requests/${params.requestId}`,
  ).catch(() => null);

  return (
    <main>
      <h1>Deliver shortlist to employer</h1>
      <p>
        You're about to send the confirmed shortlist for{" "}
        <strong>{request?.title ?? "this request"}</strong> to the employer.
        This action cannot be undone.
      </p>
      <DeliverButton requestId={params.requestId} />
    </main>
  );
}
```

```tsx
// app/admin/review/[requestId]/deliver/DeliverButton.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientFetch, ApiError } from "@/lib/api/client";
import type { DeliverShortlistResponse } from "@/lib/types/review";

export function DeliverButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<DeliverShortlistResponse | null>(null);

  async function deliver() {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await clientFetch<DeliverShortlistResponse>(
        `/admin/review/shortlists/${requestId}/deliver`,
        { method: "POST" },
      );
      setResult(data);
    } catch (e) {
      if (e instanceof ApiError) {
        switch (e.code) {
          case "NO_CONFIRMED_SHORTLIST":
            setErr("You need to confirm a shortlist first. Go back to the picker.");
            break;
          case "ALREADY_DELIVERED":
            setErr("This shortlist has already been delivered.");
            break;
          case "INSUFFICIENT_ROLE":
            setErr("Only admin_lead or system_admin can deliver shortlists.");
            break;
          default:
            setErr(e.message);
        }
      } else {
        setErr("Failed to deliver shortlist.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div>
        <h2>✅ Delivered</h2>
        <p>Final charge: ₦{result.final_charge.toLocaleString()}</p>
        <p>Credit returned to employer: ₦{result.credit_returned.toLocaleString()}</p>
        <button onClick={() => router.push("/admin/review")}>
          Back to queue
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={deliver} disabled={busy}>
        {busy ? "Delivering…" : "Confirm and deliver"}
      </button>
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}
```

---

## Putting it all together — file structure

```
app/
└── admin/
    └── review/
        ├── page.tsx                          ← Step 1: queue
        ├── submission/
        │   └── [id]/
        │       ├── page.tsx                  ← Step 3: detail
        │       ├── TriageActions.tsx         ← Step 4
        │       └── ScoreForm.tsx             ← Step 5
        └── [requestId]/
            ├── page.tsx                      ← Step 2: submissions for a request
            ├── shortlist/
            │   ├── page.tsx                  ← Step 7: candidates pool
            │   └── ShortlistPicker.tsx       ← Step 8: confirm
            └── deliver/
                ├── page.tsx                  ← preview
                └── DeliverButton.tsx         ← Step 9: deliver
```

---

## One thing to remember above all else

The IDs are everything. Always trace them back to the response that gave them to you. Never paste an example UUID from the Swagger docs — those are illustrative placeholders, not real records.

**The pattern that always works:**

1. Fetch list endpoint → get IDs from the response
2. Fetch detail endpoint with those IDs → get nested IDs from the response
3. Use those nested IDs in your action (triage, score, confirm)

If a request returns 404, the ID came from the wrong place. If it returns 400 with `SUBMISSION_REQUEST_MISMATCH`, you used a submission from a different request. If it returns 400 with `CANDIDATE_SUBMISSION_MISMATCH`, the candidate_id and submission_id don't go together. Read the error code, fix the source of the ID, retry.
