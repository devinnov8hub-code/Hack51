import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError } from "../exceptions/errors.js";

// ─── Catalog Roles ─────────────────────────────────────────────────────────

export async function listCatalogRoles(activeOnly = true) {
  let q = supabase.from("catalog_roles").select(`
    id, name, description, is_active, created_at, updated_at,
    catalog_skill_levels(id, level),
    challenges(id, title, is_active)
  `).order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getCatalogRole(id: string) {
  const { data, error } = await supabase.from("catalog_roles").select(`
    id, name, description, is_active, created_at, updated_at,
    catalog_skill_levels(id, level),
    catalog_capabilities(id, title, summary),
    challenges(id, title, summary, is_active,
      rubric_criteria(id, title, description, weight, sort_order))
  `).eq("id", id).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Role not found", "ROLE_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function createCatalogRole(input: {
  name: string; description?: string; created_by: string;
  skill_levels?: string[]; capabilities?: { title: string; summary?: string }[];
}) {
  const { data: role, error } = await supabase.from("catalog_roles")
    .insert({ name: input.name, description: input.description, created_by: input.created_by })
    .select().single();
  if (error) throw new InternalError(error.message);

  if (input.skill_levels?.length) {
    const levels = input.skill_levels.map(level => ({ catalog_role_id: role.id, level }));
    const { error: le } = await supabase.from("catalog_skill_levels").insert(levels);
    if (le) throw new InternalError(le.message);
  }
  if (input.capabilities?.length) {
    const caps = input.capabilities.map(c => ({ catalog_role_id: role.id, ...c }));
    const { error: ce } = await supabase.from("catalog_capabilities").insert(caps);
    if (ce) throw new InternalError(ce.message);
  }
  return getCatalogRole(role.id);
}

export async function updateCatalogRole(id: string, input: {
  name?: string; description?: string; is_active?: boolean;
}) {
  const { error } = await supabase.from("catalog_roles")
    .update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new InternalError(error.message);
  return getCatalogRole(id);
}

export async function deleteCatalogRole(id: string) {
  const { error } = await supabase.from("catalog_roles").delete().eq("id", id);
  if (error) throw new InternalError(error.message);
}

// ─── Challenges ────────────────────────────────────────────────────────────

export async function listChallenges(activeOnly = true) {
  let q = supabase.from("challenges").select(`
    id, title, summary, is_active, created_at,
    catalog_roles(id, name),
    rubric_criteria(id, title, weight)
  `).order("created_at", { ascending: false });
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getChallenge(id: string) {
  const { data, error } = await supabase.from("challenges").select(`
    id, title, summary, scenario, deliverables,
    submission_format, constraints_text, submission_requirements,
    is_active, created_at, updated_at,
    catalog_roles(id, name),
    rubric_criteria(id, title, description, weight, sort_order)
  `).eq("id", id).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Challenge not found", "CHALLENGE_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function createChallenge(input: {
  catalog_role_id: string; title: string; summary?: string; scenario?: string;
  deliverables?: string[]; submission_format?: string; constraints_text?: string;
  submission_requirements?: string; created_by: string;
  rubric_criteria?: { title: string; description?: string; weight: number; sort_order?: number }[];
}) {
  const { rubric_criteria, ...challengeData } = input;
  const { data: ch, error } = await supabase.from("challenges")
    .insert(challengeData).select().single();
  if (error) throw new InternalError(error.message);

  if (rubric_criteria?.length) {
    // Validate weights sum to 100
    const total = rubric_criteria.reduce((s, c) => s + c.weight, 0);
    if (total !== 100) throw new InternalError("Rubric criteria weights must sum to 100");
    const criteria = rubric_criteria.map((c, i) => ({
      challenge_id: ch.id, ...c, sort_order: c.sort_order ?? i
    }));
    const { error: re } = await supabase.from("rubric_criteria").insert(criteria);
    if (re) throw new InternalError(re.message);
  }
  return getChallenge(ch.id);
}

export async function updateChallenge(id: string, input: {
  title?: string; summary?: string; scenario?: string; deliverables?: string[];
  submission_format?: string; constraints_text?: string;
  submission_requirements?: string; is_active?: boolean;
  rubric_criteria?: { id?: string; title: string; description?: string; weight: number; sort_order?: number }[];
}) {
  const { rubric_criteria, ...challengeData } = input;
  if (Object.keys(challengeData).length) {
    const { error } = await supabase.from("challenges")
      .update({ ...challengeData, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new InternalError(error.message);
  }
  if (rubric_criteria?.length) {
    const total = rubric_criteria.reduce((s, c) => s + c.weight, 0);
    if (total !== 100) throw new InternalError("Rubric criteria weights must sum to 100");
    await supabase.from("rubric_criteria").delete().eq("challenge_id", id);
    const criteria = rubric_criteria.map((c, i) => ({
      challenge_id: id, title: c.title, description: c.description,
      weight: c.weight, sort_order: c.sort_order ?? i
    }));
    const { error: re } = await supabase.from("rubric_criteria").insert(criteria);
    if (re) throw new InternalError(re.message);
  }
  return getChallenge(id);
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw new InternalError(error.message);
}
