// =============================================
// Hack51 – Global API Response Types
// =============================================

export type ApiStatus = "success" | "error";

export interface ApiErrorDetail {
  code: string;
  details?: string;
}

export interface ApiResponse<T = unknown> {
  status: ApiStatus;
  message: string;
  data: T | null;
  error: ApiErrorDetail | null;
}

// Convenience builder: success
export function successResponse<T>(
  message: string,
  data: T
): ApiResponse<T> {
  return {
    status: "success",
    message,
    data,
    error: null,
  };
}

// Convenience builder: error
export function errorResponse(
  message: string,
  code: string,
  details?: string
): ApiResponse<null> {
  return {
    status: "error",
    message,
    data: null,
    error: { code, details },
  };
}
