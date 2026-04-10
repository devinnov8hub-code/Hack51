import { supabase } from "../config/supabase.js";
import { InternalError } from "../exceptions/errors.js";

export interface EmployerWorkspaceRow {
  id: string;
  owner_id: string;
  name: string | null;
  company_name: string | null;
  company_url: string | null;
  industry: string | null;
  team_size: string | null;
  created_at: string;
  updated_at: string;
}

export async function findWorkspaceByOwner(ownerId: string): Promise<EmployerWorkspaceRow | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", ownerId)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new InternalError(`DB error: ${error.message}`);
  return data as EmployerWorkspaceRow;
}

export async function createWorkspace(ownerId: string): Promise<EmployerWorkspaceRow> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ owner_id: ownerId })
    .select()
    .single();
  if (error) throw new InternalError(`Failed to create workspace: ${error.message}`);
  return data as EmployerWorkspaceRow;
}

export async function updateWorkspace(
  workspaceId: string,
  fields: Partial<Omit<EmployerWorkspaceRow, "id" | "owner_id" | "created_at">>
): Promise<EmployerWorkspaceRow> {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .select()
    .single();
  if (error) throw new InternalError(`Failed to update workspace: ${error.message}`);
  return data as EmployerWorkspaceRow;
}
