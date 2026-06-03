import api from "../api";
import { AdminDashboardProps, EmployerDashboardProps, CandidateDashboardProps } from "@/types/dashboard";

export const dashboardService = {
  // =========================
  //  EMPLOYER DASHBOARD
  // =========================
  getEmployerDashboardData: async (): Promise<EmployerDashboardProps> => {
    const res = await api.get("/employer/dashboard");
    return res.data;
  },

  // =========================
  //  ADMIN DASHBOARD
  // =========================
  getAdminDashboardData: async (): Promise<AdminDashboardProps> => {
    const res = await api.get("/admin/dashboard");
    return res.data;
  },

  // =========================
  //  CANDIDATE DASHBOARD
  // =========================
  getCandidateDashboardData: async (): Promise<CandidateDashboardProps> => {
    const res = await api.get("/candidate/dashboard");
    return res.data;
  },
};
