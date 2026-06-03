import { CreateChallengeWithRubric } from "@/types/catalog";
import api from "../api";

export const challengeService = {
  createChallenge: async (data: CreateChallengeWithRubric) => {
    const response = await api.post("/admin/catalog/challenges", data);
    return response.data;
  },

  getChallenges: async (params: Record<string, any> = {}) => {
    const response = await api.get("/admin/catalog/challenges", { params });
    return response;
  },

  getChallengeById: async (id: string) => {
    const response = await api.get(`/admin/catalog/challenges/${id}`);
    return response;
  },

  updateChallenge: async (id: string, data: CreateChallengeWithRubric) => {
    const response = await api.put(`/admin/catalog/challenges/${id}`, data);
    return response.data;
  },

  deleteChallenge: async (id: string) => {
    const response = await api.delete(`/admin/catalog/challenges/${id}`);
    return response;
  },

  // ========================
  // CANDIDATES
  // ========================
  getCandidateChallenges: async () => {
    const response = await api.get("/candidate/challenges");
    return response;
  },
  getCandidateChallengeDetails: async (id: string) => {
    const response = await api.get(`/candidate/challenges/${id}`);
    return response;
  },
};
