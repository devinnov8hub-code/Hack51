import { RoleCreationPayload } from "@/types/catalog";
import api from "../api";

export const catalogService = {
  createRole: async (data: RoleCreationPayload) => {
    const response = await api.post("/admin/catalog/roles", data);
    return response.data;
  },

  getRoles: async (params: Record<string, any> = {}) => {
    const response = await api.get("/admin/catalog/roles", { params });
    return response.data;
  },

  getRoleById: async (id: string) => {
    const response = await api.get(`/admin/catalog/roles/${id}`);
    return response;
  },

  updateRole: async (id: string, data: RoleCreationPayload) => {
    const response = await api.put(`/admin/catalog/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id: string) => {
    const response = await api.delete(`/admin/catalog/roles/${id}`);
    return response;
  },
};
