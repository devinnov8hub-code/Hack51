import { SubmissionStatus } from "./submissions";

export interface ShortlistProps {
  id: string;
  title: string;
  role_level: string;
  shortlist_size: number;
  status: SubmissionStatus;
}

export interface ShortlistedCandidatesProps {
  id: string;
  title: string;
  role_type: string;
  role_level: string;
  shortlist_size: number;
  status: "shortlisted";
  deposit_amount: number;
  final_charge: number;
  published_at: string;
  shortlists: {
    id: string;
    rank: number;
    users: {
      id: string;
      email: string;
      last_name: string;
      avatar_url: string | null;
      first_name: string;
    };
    submissions: {
      id: string;
      total_score: number;
      artifact_urls: string[];
      reviewer_notes: string;
      submission_scores: [
        {
          weight: number;
          score_percent: number;
          criterion_title: string;
        },
      ];
      submission_statement: string;
    };
    total_score: number | null;
    confirmed_at: string;
    delivered_at: string;
  }[];
}

export interface UnlockFullList{
    request_id: string;
    amount_ngn: number;
    payment: {
      payment_reference: string;
      authorization_url: string;
      access_code: string;
      skip: true,
      status: "success"
    },
    unlocked: true
  }

