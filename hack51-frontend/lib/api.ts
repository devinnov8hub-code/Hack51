import axios, { AxiosError } from "axios";
import { authService } from "./services/auth.service";

/**
 * ApiError — a typed error our app throws/rejects when an API call fails.
 *
 * Callers can branch on `.code` (from the backend's `error.code`) or
 * `.status` (HTTP status). They can also just read `.message` for display.
 * Existing code that does `err.message` keeps working because we extend Error.
 *
 * BACKWARDS COMPATIBILITY: this also exposes `.response.data.message` and
 * `.response.data.error` so any existing form/component reading the raw
 * axios shape (`err?.response?.data?.message`) keeps working unchanged.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  data: unknown;
  // Mirror of the axios error shape so old callers reading
  // `err.response.data.message` keep working without changes.
  response: { status: number; data: { message: string; error: { code: string | null } } };

  constructor(opts: { message: string; status: number; code?: string | null; data?: unknown }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.data = opts.data ?? null;
    this.response = {
      status: opts.status,
      data: {
        message: opts.message,
        error: { code: opts.code ?? null },
      },
    };
  }
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  // Guard against SSR — localStorage is window-only
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,

  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any;
    const err = error.response;

    // 401 → try refresh once, then retry. If refresh fails, log out.
    if (err?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        await authService.refreshToken();
        if (typeof window !== "undefined") {
          const accessToken = localStorage.getItem("access_token");
          if (accessToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
        }
        return api(originalRequest);
      } catch {
        authService.logout();
        return Promise.reject(
          new ApiError({ message: "Session expired.", status: 401 }),
        );
      }
    }

    // Build a stable, displayable error regardless of what failed.
    // Old code did `err.data.message` which crashed when:
    //   - the request never reached the server (network/CORS/timeout) → err is undefined
    //   - the server returned a non-JSON body                          → err.data is undefined
    //   - the server returned a JSON body without a message field      → err.data.message is undefined
    const status = err?.status ?? 0;
    const data = err?.data as { message?: string; error?: { code?: string } } | undefined;
    const message =
      data?.message ??
      error.message ??
      (status === 0 ? "Network error — please check your connection." : "Request failed");
    const code = data?.error?.code ?? null;

    return Promise.reject(new ApiError({ message, status, code, data }));
  },
);

export default api;