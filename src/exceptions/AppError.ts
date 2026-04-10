import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends HTTPException {
  public readonly errorCode: string;

  constructor(
    status: ContentfulStatusCode,
    message: string,
    errorCode: string,
    cause?: unknown
  ) {
    super(status, { message, cause });
    this.errorCode = errorCode;
  }
}
