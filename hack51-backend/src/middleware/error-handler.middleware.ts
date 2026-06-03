import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { AppError } from "../exceptions/AppError.js";
import { errorResponse } from "../types/api-response.js";
import { ZodError } from "zod";

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (err: unknown) {
    // Our typed application errors
    if (err instanceof AppError) {
      return c.json(
        errorResponse(err.message, err.errorCode),
        err.status as 400 | 401 | 403 | 404 | 409 | 422 | 500
      );
    }

    // Base Hono HTTP exceptions (e.g. from jwt middleware)
    if (err instanceof HTTPException) {
      return c.json(
        errorResponse(err.message, "HTTP_ERROR"),
        err.status as 400 | 401 | 403 | 404 | 500
      );
    }

    // Zod validation errors
    if (err instanceof ZodError) {
      const first = err.errors[0];
      return c.json(
        errorResponse(
          first?.message ?? "Validation error",
          "VALIDATION_ERROR",
          JSON.stringify(err.errors)
        ),
        422
      );
    }

    // Unexpected errors
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[unhandled error]", err);
    return c.json(errorResponse(message, "INTERNAL_ERROR"), 500);
  }
}
