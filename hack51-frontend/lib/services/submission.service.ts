import { EmployerRequest } from "@/types/employer";
import { ApiResponse } from "@/types/api";
import api from "../api";
import { CandidateSubmission , SubmissionListProps } from "@/types/submissions";

export const submissionService = {
  getCandidateSubmissions: async () => {
    const res: ApiResponse<any> = await api.get("candidate/submissions", {
      params: {
        page: 1,
        limit: 10,
      },
    });
    return res;
  },
  getCandidateSubmissionById: async (id: string) => {
    const res = await api.get(`candidate/submissions/${id}`);
    return res.data;
  },
  submitArtifact: async (
    id: string,
    data: CandidateSubmission,
  ): Promise<EmployerRequest> => {
    const response = await api.post(`/candidate/challenges/${id}/submit`, data);
    return response.data;
  },
};
