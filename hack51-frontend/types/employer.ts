import { CreateChallengeWithRubric } from "./catalog"

export type RequestStatus =
  | "draft"
  | "published"
  | "evaluating"
  | "shortlisted"
  | "closed"
  | "cancelled";

export interface RubricCriterion {
  id?: string;
  title: string;
  description?: string | null;
  weight: number;
  sort_order?: number;
}

export interface EmployerRequest {
  id: string;
  title: string;
  role_type: string;
  role_level: string;
  status: RequestStatus;
  challenge_id?: string;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string;
  deposit_amount: number;
  admin_fee: number;
  final_charge: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  challenges: Challenge;
  received_submissions? : number;
}

export interface Challenge extends CreateChallengeWithRubric {
  id: string;
}

export interface CreateRequestPayload {
  title: string;
  role_type: string;
  role_level?: string;
  challenge_id: string;
  challenge_cap: number;
  shortlist_size: number;
  deadline: string;
}

export interface UpdateRequestPayload {
  title?: string;
  role_type?: string;
  role_level?: string;
  challenge_id?: string;
  challenge_cap?: number;
  shortlist_size?: number;
  deadline?: string;
}

// export interface Role {
//   id: string;
//   name: string;
// }

// export interface Challenge {
//   id: string;
//   title: string;
//   description?: string;
// }

// export interface Shortlist {
//   id: string;
//   request_id: string;
//   candidates: Candidate[];
// }

// export interface Candidate {
//   id: string;
//   name: string;
//   score: number;
// }

export interface PaymentInitResponse {
  authorization_url: string;
  reference: string;
}
