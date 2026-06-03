import { EmployerRequest } from "./employer";

export type Days = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface EmployerDashboardProps {
  summary: {
    total_requests: number;
    total_submissions: number;
    total_evaluations: number;
    total_shortlists_delivered: number;
    unread_notifications: number;
    by_status: {
      shortlisted: number;
      published: number;
      draft: number;
    };
  };
  active_requests: EmployerRequest[];
  recent_requests: EmployerRequest[];
}

export interface AdminDashboardProps {
  stats: {
    submissions_received: number;
    invalid_submissions: number;
    evaluated_submissions: number;
    shortlists_delivered: number;
  };
  users: {
    total: number;
    verified: number;
    active: number;
    by_role: {
      candidate: number;
      employer: number;
      system_admin: number;
      admin_reviewer: number;
    };
  };
  requests: {
    total: number;
    by_status: {
      draft: number;
      published: number;
      shortlisted: number;
    };
  };
  payments: {
    total_revenue_ngn: number;
    total_transactions: number;
  };
  charts: {
    evaluations_per_day: {
      day: Days;
      count: number;
    };
  }[];

  requests_overview: {
    label: string;
    value: number;
  }[];
}

export interface CandidateDashboardProps {
 summary: {
      total_submissions: number;
      total_shortlisted: number;
      unread_notifications: number;
      by_status: {
        under_review: number;
        scored: number;
      }
    },
    recent_submissions: [
      {
        id: string;
        status: "under_review",
        submitted_at: string;
        job_requests: {
          title: string;
          deadline: string;
          role_type: string;
        }
      },
    
    ],
    shortlists: string[],
    profile: {
      skills: string[],
      experience_years: number | null,
      location: string | null
    }
  };
