import api from "../api";
import {
  EmployerRequest,
  CreateRequestPayload,
  UpdateRequestPayload,
  PaymentInitResponse,
} from "@/types/employer";
import { EmployerRoles } from "@/types/catalog";
import { ShortlistedCandidatesProps } from "@/types/shortlist";

export const employerService = {
  // =========================
  //  CATALOG
  // =========================
  getRoles: async (): Promise<EmployerRoles[]> => {
    const res = await api.get("/employer/catalog/roles");
    return res.data.approved;
  },

  getRoleById: async (id: string): Promise<EmployerRoles> => {
    const res = await api.get(`/employer/catalog/roles/${id}`);
    return res.data;
  },

  getChallenges: async () => {
    const res = await api.get("/employer/catalog/challenges");
    return res.data.approved;
  },

  getChallengeById: async (id: string) => {
    const res = await api.get(`/employer/catalog/challenges/${id}`);
    return res.data;
  },

  // =========================
  //  REQUESTS
  // =========================
  getRequests: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    drafts?: boolean;
  }): Promise<EmployerRequest[]> => {
    const res = await api.get("/employer/requests", { params });
    return res.data;
  },

  createRequest: async (
    payload: CreateRequestPayload,
  ): Promise<EmployerRequest> => {
    const res = await api.post("/employer/requests", payload);
    return res.data;
  },

  getRequestById: async (id: string): Promise<EmployerRequest> => {
    const res = await api.get(`/employer/requests/${id}`);
    return res.data;
  },

  updateRequest: async (
    id: string,
    payload: Partial<EmployerRequest>,
  ): Promise<EmployerRequest> => {
    const res = await api.patch(`/employer/requests/${id}`, { payload });
    return res.data;
  },

  deleteRequest: async (id: string): Promise<void> => {
    await api.delete(`/employer/requests/${id}`);
  },

  publishRequest: async (id: string, challenge_id: string) => {
    const res = await api.post(`/employer/requests/${id}/publish`, {
      challenge_id,
    });
    return res.data.request;
  },

  // =========================
  //  SHORTLISTS
  // =========================
  getShortlists: async (): Promise<ShortlistedCandidatesProps[]> => {
    const res = await api.get("/employer/shortlists");
    return res.data;
  },

  getShortlistById: async (id: string): Promise<ShortlistedCandidatesProps> => {
    const res = await api.get(`/employer/shortlists/${id}`);
    return res.data;
  },

  // =========================
  //  BILLING
  // =========================
  getBilling: async () => {
    const res = await api.get("/employer/billing");
    return res.data;
  },

  initiatePayment: async (): Promise<PaymentInitResponse> => {
    const res = await api.post("/employer/payments/initiate");
    return res.data;
  },

  verifyPayment: async (reference: string) => {
    const res = await api.get(`/employer/payments/verify/${reference}`);
    return res.data;
  },

  exportShortlistCSV: async (id: string) => {
    const res = await api.get(`/employer/shortlists/${id}/export.csv`, {
      responseType: "blob",
    });
    return res.data;
  },
};
