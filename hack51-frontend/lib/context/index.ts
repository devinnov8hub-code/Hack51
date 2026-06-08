import { create } from "zustand";
import { LoginProps, RegisterProps, VerificationProps } from "@/types/auth";
import { authService } from "../services/auth.service";
import { ApiResponse } from "@/types/api";
import { User } from "@/types/user";

export const userAuth = create((set) => ({
  user: authService.getCurrentUser(),
  isVerified: false,
  isAuthenticated: authService.isAuthenticated(),

  login: async (data: LoginProps) => {
    const response: ApiResponse<User> = await authService.login(data);
    set({ user: response.user, isAuthenticated: true });
    return response;
  },

  register: async (data: RegisterProps) => {
    const response = await authService.register(data);
    // Registration does NOT log the user in — they still need to verify email.
    // Do not set isAuthenticated here.
    return response;
  },

  verifyEmail: async (data: VerificationProps) => {
    const response = await authService.verifyEmail(data);
    set({ isVerified: true });
    return response;
  },

  resendOtp: async (email: string) => {
    // Let errors bubble up so callers can show them
    const response = await authService.resendOtp(email);
    return response;
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },
}));