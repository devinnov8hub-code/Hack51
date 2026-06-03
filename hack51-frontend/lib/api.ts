import { config } from "./../middleware";
import { ApiResponse } from "@/types/api";
import axios from "axios";
import { authService } from "./services/auth.service";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;
    const err = error.response;

    if (err?.status === 401) {
      originalRequest._retry = true;
      try {
        await authService.refreshToken();
        const accessToken = localStorage.getItem("access_token");
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        authService.logout();
        const message = err?.data?.message || "Request failed";
        // console.log("message", message);
        return Promise.reject(new Error("Session expired. "));
      }
    }

    return Promise.reject(err.data.message);
  },
);

export default api;
