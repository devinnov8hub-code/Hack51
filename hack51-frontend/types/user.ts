export type UserRole = "system_admin" | "employer" | "candidate";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  role: UserRole;
  workspace?: string[];
  is_verified: boolean;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  // updated_at: string;
}
