import { LoginProps, RegisterProps, VerificationProps } from "@/types/auth";
import api from "../api";
import { ApiResponse } from "@/types/api";
import { User, UserRole } from "@/types/user";
import axios from "axios";

/**
 * Dedicated axios instance with NO interceptors, used only by refreshToken().
 * Why: the main `api` instance has a response interceptor that calls
 * refreshToken() on 401. If we used `api` here and the refresh itself
 * returned 401 (expired/revoked refresh token), the interceptor would call
 * refreshToken() again → infinite loop. Using a clean instance breaks the cycle.
 */
const rawApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const authService = {
  login: async (data: LoginProps) => {
    const res: ApiResponse<any> = await api.post("/auth/login", data);
    const tokens = res.data;
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Invalid login res: missing tokens");
    }

    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    document.cookie = `access_token=${tokens.access_token}; path=/`;
    document.cookie = `refresh_token=${tokens.refresh_token}; path=/`;
    return await authService.getProfile(); // Fetches and stores user profile after login
  },

  register: async (data: RegisterProps) => {
    const response: ApiResponse<any> = await api.post("/auth/register", data);
    return response.data;
  },

  verifyEmail: async (data: VerificationProps) => {
    const response = await api.post("/auth/verify-email", data);
    return response;
  },

  resendOtp: async (email: string) => {
    const response = await api.post("/auth/resend-otp", { email });
    return response;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    document.cookie =
      "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie =
      "refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    window.location.href = "/auth/login";
  },

  getProfile: async () => {
    const response: ApiResponse<User> = await api.get("/auth/me");

    // optionally store user
    if (response) {
      localStorage.setItem("user", JSON.stringify(response.data));
      document.cookie = `user=${encodeURIComponent(JSON.stringify(response.data))}; path=/`;
    }

    return { user: response.data };
  },

  getCurrentUser: () => {
    if (typeof window === "undefined") {
      return null;
    }

    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  /**
   * Rotate access/refresh tokens.
   *
   * - Uses `rawApi` (no interceptors) so a 401 on /auth/refresh itself does
   *   NOT trigger another refresh → no infinite loop.
   * - Uses a relative path `/auth/refresh` because `rawApi` already has
   *   baseURL set. (The old code did `${base_url}/auth/refresh` which
   *   doubled the host into the URL.)
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const res = await rawApi.post("/auth/refresh", {
      refresh_token: refreshToken,
    });

    // rawApi has no response interceptor, so the envelope is still here.
    // Backend shape: { status, message, data: { access_token, refresh_token }, error }
    const payload = res.data?.data;
    const accessToken = payload?.access_token;
    const newRefreshToken = payload?.refresh_token;

    if (!accessToken || !newRefreshToken) {
      throw new Error("Refresh response missing tokens");
    }

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", newRefreshToken);

    // Keep cookies in sync — middleware.ts reads these
    document.cookie = `access_token=${accessToken}; path=/`;
    document.cookie = `refresh_token=${newRefreshToken}; path=/`;
  },

  isAuthenticated: () => {
    if (typeof window === "undefined") {
      return false;
    }
    return !!localStorage.getItem("access_token");
  },

  isVerified: () => {
    if (typeof window === "undefined") {
      return false;
    }
    return !!localStorage.getItem("verified");
  },

  getRoleRoute: (role: UserRole) => {
    const roleRoutes: Record<UserRole, string> = {
      system_admin: "/admin/dashboard",
      employer: "/dashboard",
      candidate: "/candidate/dashboard",
    };

    return roleRoutes[role];
  },

  //   updateProfile: async (profileData) => {
  //     return await api.put("/auth/profile", profileData);
  //   },

  //   changePassword: async (currentPassword, newPassword) => {
  //     return await api.post("/auth/change-password", {
  //       currentPassword,
  //       newPassword,
  //     });
  //   },
};