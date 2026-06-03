import type { Context, Next } from "hono";
import { errorResponse } from "../types/api-response.js";

/**
 * Standard UUID v1–v5 regex. Matches what Postgres `uuid` type accepts.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Param names that should always be validated as UUIDs when they appear
 * in the route. Add more here if new UUID-shaped params get introduced.
 *
 * Anything NOT in this list is left alone (e.g. `:reference` for payment
 * references, `:email` for the dev OTP endpoint).
 */
const UUID_PARAMS = new Set([
  "id",
  "requestId",
  "userId",
  "submissionId",
  "challengeId",
  "candidateId",
]);

/**
 * Validate path parameters that look like UUIDs BEFORE they reach the
 * controller. Without this, malformed UUIDs (e.g. literal "{requestId}"
 * from Swagger UI not substituting the placeholder) flow into Supabase
 * and trigger Postgres errors like:
 *   "invalid input syntax for type uuid: \"{requestId}\""
 * which the error handler turns into an HTTP 500.
 *
 * After this middleware: malformed UUIDs return a clean 400 with
 * INVALID_UUID and a message naming the offending param. Postgres
 * internals are never leaked.
 *
 * Mounted globally (in app.ts) BEFORE the route routers.
 */
export async function uuidPathValidator(c: Context, next: Next) {
  const params = c.req.param() as Record<string, string>;
  for (const [name, value] of Object.entries(params)) {
    if (!UUID_PARAMS.has(name)) continue;
    if (!value) continue;
    if (!UUID_RE.test(value)) {
      return c.json(
        errorResponse(
          `Invalid UUID in path parameter '${name}'. Got: "${value}"`,
          "INVALID_UUID",
        ),
        400,
      );
    }
  }
  await next();
}
