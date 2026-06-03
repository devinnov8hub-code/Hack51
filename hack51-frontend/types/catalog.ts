export type SkillLevel = "entry-level" | "mid-level" | "senior";

export interface RoleCreationPayload {
  name?: string;
  description?: string;
  skill_levels?: SkillLevel[];
  capabilities?: {
    title: string;
    summary: string;
  }[];
}

export interface Capability {
  title: string;
  summary: string;
}

export interface EmployerRoles {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  status: "approved"| "pending" | "rejected";
  proposed_by: null;
  created_at: string;
  updated_at: string;
  catalog_skill_levels: { id: string; level: string }[];
  challenges: string[];
  catalog_capabilities?: Capability[];
}

export interface CreateChallengeWithRubric {
  catalog_role_id?: string;
  title?: string;
  summary?: string;
  scenario?: string;
  deliverables: string[];
  submission_format?: string;
  constraints_text?: string;
  submission_requirements?: string;
  rubric_criteria?: {
    title: string;
    description: string;
    weight: number;
  }[];
}


