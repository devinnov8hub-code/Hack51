import type { Context, Next } from "hono";
import type { ZodSchema } from "zod";
import { errorResponse } from "../types/api-response.js";

/**
 * Validates c.req.json() against a Zod schema.
 * On failure returns a standard error response with full field-level details.
 * The `message` is set to the FIRST field error so the frontend can display
 * it directly — not the generic "Validation failed" string.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorResponse("Request body must be valid JSON", "INVALID_JSON"), 400);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const errors = result.error.errors;

      // Use the first field error as the human-readable message so the
      // frontend can show it directly without needing to parse `details`.
      const firstError = errors[0];
      const fieldLabel = firstError?.path?.length ? `${firstError.path.join(".")}: ` : "";
      const message = firstError ? `${fieldLabel}${firstError.message}` : "Validation failed";

      // Keep the full error list in details for debugging / field-level UI
      const details = errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");

      return c.json(
        errorResponse(message, "VALIDATION_ERROR", details),
        422
      );
    }

    c.set("validatedBody" as never, result.data);
    await next();
  };
}

/**
 * Retrieves the validated body set by validateBody middleware.
 */
export function getBody<T>(c: Context): T {
  return c.get("validatedBody" as never) as T;
}