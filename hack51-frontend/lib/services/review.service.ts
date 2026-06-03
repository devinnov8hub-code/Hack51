import api from "../api";

export const reviewService = {
  getRequests: async (params: Record<string, any>) => {
    const response = await api.get("/admin/review/requests", { params });

    return response;
  },
  getAllRequestSubmissions: async (
    requestId: string,
    params: Record<string, any>,
  ) => {
    const response = await api.get(
      `/admin/review/requests/${requestId}/submissions`,
      { params },
    );

    return response;
  },
  getSubmissionsById: async (id: string) => {
    const response = await api.get(`/admin/review/submissions/${id}`);
    return response;
  },
  triageSubmission: async (id: string, data: Record<string, any>) => {
    const response = await api.post(
      `/admin/review/submissions/${id}/triage`,
      data,
    );

    return response;
  },
  scoreSubmission: async (id: string, data: Record<string, any>) => {
    const response = await api.post(
      `/admin/review/submissions/${id}/score`,
      data,
    );

    return response;
  },
  getShortlists: async (params: Record<string, any>) => {
    const response = await api.get("/admin/review/shortlists", { params });

    return response;
  },
  getShortListedCandidates: async (
    requestId: string,
    params: Record<string, any>,
  ) => {
    const response = await api.get(
      `/admin/review/shortlists/${requestId}/candidates`,
      { params },
    );

    return response;
  },
  confirmTopNCandidates: async (
    requestId: string,
    params: Record<string, any>,
  ) => {
    const response = await api.post(
      `/admin/review/shortlists/${requestId}/confirm`,
      params,
    );

    return response;
  },
  deliverFinalShortlist: async (requestId: string, submissionIds: string[]) => {
    const response = await api.post(
      `/admin/review/shortlists/${requestId}/deliver`,
      { submission_ids: submissionIds },
    );

    return response;
  },
};
