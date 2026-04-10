import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";

export interface CandidateProfileRow {
  id: string;
  user_id: string;
  bio: string | null;
  skills: string[] | null;
  experience_years: number | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  updated_at: string;
}

export async function findCandidateProfile(userId: string): Promise<CandidateProfileRow | null> {
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new InternalError(`DB error: ${error.message}`);
  return data as CandidateProfileRow;
}

export async function upsertCandidateProfile(
  userId: string,
  fields: Partial<Omit<CandidateProfileRow, "id" | "user_id" | "updated_at">>
): Promise<CandidateProfileRow> {
  const { data, error } = await supabase
    .from("candidate_profiles")
    .upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw new InternalError(`Failed to upsert candidate profile: ${error.message}`);
  return data as CandidateProfileRow;
}
