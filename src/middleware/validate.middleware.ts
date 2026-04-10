import type { Context, Next } from "hono";
import type { ZodSchema } from "zod";
import { errorResponse } from "../types/api-response.js";

/**
 * Validates c.req.json() against a Zod schema.
 * On failure returns a standard error response with full field-level details.
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
      const details = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return c.json(
        errorResponse("Validation failed", "VALIDATION_ERROR", details),
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
