import { LoginProps, RegisterProps, VerificationProps } from "@/types/auth";
import api from "../api";
import { ApiResponse } from "@/types/api";
import { User, UserRole } from "@/types/user";

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

  refreshToken: async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const base_url = process.env.NEXT_PUBLIC_BASE_URL;

    const response = await api.post(`${base_url}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const accessToken = response.data.access_token;
    const newNefreshToken = response.data.refresh_token;
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", newNefreshToken);
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
