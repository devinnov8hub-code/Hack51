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
    try {
      const response: ApiResponse<User> = await authService.login(data);

      set({ user: response.user, isAuthenticated: true });
      return response;
    } catch (error) {
      throw error;
    }
  },

  register: async (data: RegisterProps) => {
    try {
      const response = await authService.register(data);
      set({ user: response.user, isAuthenticated: true, isVerified: true });
      return response;
    } catch (error) {
      throw error;
    }
  },

  verifyEmail: async (data: VerificationProps) => {
    try {
      const response = await authService.verifyEmail(data);
      set({ isVerified: false });
      return response;
    } catch (error) {
      throw error;
    }
  },

  resendOtp: async (email: string) => {
    try {
      const response = await authService.resendOtp(email);
      return response;
    } catch (err) {}
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  //   updateUser: (userData) => {
  //     const updatedUser = { ...useAuthStore.getState().user, ...userData };
  //     localStorage.setItem("user", JSON.stringify(updatedUser));
  //     set({ user: updatedUser });
  //   },
}));
