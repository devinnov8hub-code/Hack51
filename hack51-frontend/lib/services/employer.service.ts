import api from "../api";
import {
  EmployerRequest,
  CreateRequestPayload,
  UpdateRequestPayload,
  PaymentInitResponse,
} from "@/types/employer";
import { EmployerRoles } from "@/types/catalog";
import { ShortlistedCandidatesProps } from "@/types/shortlist";

/**
 * Response shape from POST /employer/requests/:id/publish.
 *
 * `payment.skip === true` means the backend skipped Paystack (dev / SKIP_PAYMENT mode)
 * and the request is already published — the frontend should just refresh the UI.
 *
 * `payment.skip === false` (production) means the user MUST be redirected to
 * `payment.authorization_url` to complete the Paystack checkout. The publish
 * only fully takes effect after Paystack confirms via webhook + the frontend
 * calls /employer/payments/verify/{reference}.
 */
export interface PublishResponse {
  request: EmployerRequest;
  payment: {
    payment_reference: string;
    authorization_url: string;
    access_code?: string;
    status: "success" | "pending" | "failed";
    skip: boolean;
  };
}

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

  /**
   * Publish a draft request.
   *
   * Returns BOTH `request` and `payment`. Callers must check `payment.skip`:
   *   - skip=true  → dev mode, request is live, refresh UI
   *   - skip=false → production, redirect to `payment.authorization_url`
   *
   * The second `challenge_id` argument is preserved for backwards compatibility
   * with the existing caller in RequestTable.tsx, but the backend ignores any
   * body sent here — the challenge is already attached to the request from the
   * draft phase. It's safe to omit if you update the caller.
   */
  publishRequest: async (
    id: string,
    _challenge_id?: string,
  ): Promise<PublishResponse> => {
    const res = await api.post(`/employer/requests/${id}/publish`);
    // res is the unwrapped backend envelope: { request, payment }
    return res.data as PublishResponse;
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