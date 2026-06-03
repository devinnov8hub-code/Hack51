import { BillingProps } from "@/types/billing";
import api from "../api";

export const billingService = {
  getBillingCredits: async (params: Record<string, any> = {}) => {
    const response = await api.get("/billing/credits", { params });
    return response.data;
  },

  getBillingTransactions: async (params: Record<string, any> = {}) => {
    const response = await api.get("/billing/transactions", { params });
    return response.data;
  },

  createDeposit: async (data: BillingProps) => {
    const response = await api.post("/billing/deposit", data);
    return response.data;
  },
};
