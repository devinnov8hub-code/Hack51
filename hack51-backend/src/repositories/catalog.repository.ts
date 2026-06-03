import { supabase } from "../config/supabase.js";
import { InternalError, NotFoundError, ForbiddenError } from "../exceptions/errors.js";

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG ROLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Options for listing catalog roles.
 *
 * - `activeOnly`  – default true. Hides soft-deleted / deactivated roles.
 * - `approvedOnly` – default true. Hides employer-proposed roles that are
 *                    still pending admin approval (or rejected). Set to false
 *                    when an admin is browsing the approval queue, or when an
 *                    employer is looking at their own proposals.
 * - `proposedBy`  – filter to a specific employer's proposals.
 * - `status`      – filter by proposal status ('approved' | 'pending' | 'rejected').
 */
export interface ListRolesOptions {
  activeOnly?: boolean;
  approvedOnly?: boolean;
  proposedBy?: string;
  status?: "approved" | "pending" | "rejected";
}

export async function listCatalogRoles(
  activeOrOpts: boolean | ListRolesOptions = true
) {
  // Backward-compat: old code called listCatalogRoles(true) / (false)
  const opts: ListRolesOptions =
    typeof activeOrOpts === "boolean"
      ? { activeOnly: activeOrOpts, approvedOnly: true }
      : { activeOnly: true, approvedOnly: true, ...activeOrOpts };

  // FIX (C3): include catalog_capabilities so employer role browsing works.
  let q = supabase.from("catalog_roles").select(`
    id, name, description, is_active, status, proposed_by,
    created_at, updated_at,
    catalog_skill_levels(id, level),
    catalog_capabilities(id, title, summary),
    challenges(id, title, is_active, status)
  `).order("created_at", { ascending: false });

  if (opts.activeOnly) q = q.eq("is_active", true);
  if (opts.approvedOnly) q = q.eq("status", "approved");
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.proposedBy) q = q.eq("proposed_by", opts.proposedBy);

  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getCatalogRole(id: string) {
  const { data, error } = await supabase.from("catalog_roles").select(`
    id, name, description, is_active, status, proposed_by, reject_reason,
    created_at, updated_at,
    catalog_skill_levels(id, level),
    catalog_capabilities(id, title, summary),
    challenges(id, title, summary, is_active, status,
      rubric_criteria(id, title, description, weight, sort_order))
  `).eq("id", id).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Role not found", "ROLE_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function createCatalogRole(input: {
  name: string;
  description?: string;
  created_by: string;
  status?: "approved" | "pending";   // admins create approved, employers create pending
  proposed_by?: string | null;        // employer id for proposals, null for admin-created
  skill_levels?: string[];
  capabilities?: { title: string; summary?: string }[];
}) {
  const { data: role, error } = await supabase.from("catalog_roles")
    .insert({
      name: input.name,
      description: input.description,
      created_by: input.created_by,
      status: input.status ?? "approved",
      proposed_by: input.proposed_by ?? null,
    })
    .select().single();
  if (error) throw new InternalError(error.message);

  if (input.skill_levels?.length) {
    const levels = input.skill_levels.map(level => ({ catalog_role_id: role.id, level }));
    const { error: le } = await supabase.from("catalog_skill_levels").insert(levels);
    if (le) throw new InternalError(le.message);
  }
  if (input.capabilities?.length) {
    const caps = input.capabilities.map(c => ({
      catalog_role_id: role.id,
      title: c.title,
      summary: c.summary ?? null,
    }));
    const { error: ce } = await supabase.from("catalog_capabilities").insert(caps);
    if (ce) throw new InternalError(ce.message);
  }
  return getCatalogRole(role.id);
}

/**
 * FIX (A2): PUT /admin/catalog/roles/{id} now correctly syncs the related
 * skill_levels and capabilities tables.
 *
 * Semantics:
 *   - Fields not sent (undefined) → untouched.
 *   - `skill_levels: []`        → clears all skill levels for this role.
 *   - `skill_levels: [...]`     → replaces the full set (delete + re-insert).
 *   - `capabilities: []`        → clears all capabilities for this role.
 *   - `capabilities: [...]`     → upserts: capabilities with an `id` get updated,
 *                                 those without are inserted, any existing
 *                                 capability whose id is not in the payload is
 *                                 deleted. This preserves ids (so challenges or
 *                                 anything referencing a capability by id don't
 *                                 orphan) while letting the frontend use a
 *                                 single "replace the full list" mental model.
 */
export async function updateCatalogRole(id: string, input: {
  name?: string;
  description?: string;
  is_active?: boolean;
  skill_levels?: string[];
  capabilities?: { id?: string; title: string; summary?: string }[];
}) {
  // 1. Update the scalar fields on catalog_roles
  const scalarFields: Record<string, unknown> = {};
  if (input.name !== undefined) scalarFields.name = input.name;
  if (input.description !== undefined) scalarFields.description = input.description;
  if (input.is_active !== undefined) scalarFields.is_active = input.is_active;

  if (Object.keys(scalarFields).length > 0) {
    scalarFields.updated_at = new Date().toISOString();
    const { error } = await supabase.from("catalog_roles")
      .update(scalarFields).eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  // 2. Replace skill_levels if the caller passed the field
  if (input.skill_levels !== undefined) {
    const { error: de } = await supabase.from("catalog_skill_levels")
      .delete().eq("catalog_role_id", id);
    if (de) throw new InternalError(de.message);

    if (input.skill_levels.length > 0) {
      const rows = input.skill_levels.map(level => ({ catalog_role_id: id, level }));
      const { error: ie } = await supabase.from("catalog_skill_levels").insert(rows);
      if (ie) throw new InternalError(ie.message);
    }
  }

  // 3. Upsert/replace capabilities if the caller passed the field
  if (input.capabilities !== undefined) {
    // Fetch current capability ids for this role
    const { data: existing, error: fe } = await supabase
      .from("catalog_capabilities")
      .select("id").eq("catalog_role_id", id);
    if (fe) throw new InternalError(fe.message);
    const existingIds = new Set((existing ?? []).map(r => r.id));

    // Partition payload into updates vs inserts
    const toUpdate = input.capabilities.filter(c => c.id && existingIds.has(c.id));
    const toInsert = input.capabilities.filter(c => !c.id || !existingIds.has(c.id));
    const keepIds = new Set(toUpdate.map(c => c.id!));
    const toDelete = [...existingIds].filter(id => !keepIds.has(id));

    // Delete removed capabilities
    if (toDelete.length > 0) {
      const { error: de } = await supabase.from("catalog_capabilities")
        .delete().in("id", toDelete);
      if (de) throw new InternalError(de.message);
    }
    // Update surviving capabilities
    for (const c of toUpdate) {
      const { error: ue } = await supabase.from("catalog_capabilities")
        .update({ title: c.title, summary: c.summary ?? null })
        .eq("id", c.id!);
      if (ue) throw new InternalError(ue.message);
    }
    // Insert new capabilities
    if (toInsert.length > 0) {
      const rows = toInsert.map(c => ({
        catalog_role_id: id,
        title: c.title,
        summary: c.summary ?? null,
      }));
      const { error: ie } = await supabase.from("catalog_capabilities").insert(rows);
      if (ie) throw new InternalError(ie.message);
    }
  }

  return getCatalogRole(id);
}

export async function deleteCatalogRole(id: string) {
  const { error } = await supabase.from("catalog_roles").delete().eq("id", id);
  if (error) throw new InternalError(error.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYER-PROPOSED ROLES (B1) — Admin approval workflow
// ═══════════════════════════════════════════════════════════════════════════

export async function approveRoleProposal(roleId: string, adminId: string) {
  const { data, error } = await supabase.from("catalog_roles")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roleId).eq("status", "pending")
    .select().single();
  if (error?.code === "PGRST116") {
    throw new NotFoundError("No pending role proposal with that id", "PROPOSAL_NOT_FOUND");
  }
  if (error) throw new InternalError(error.message);
  return data;
}

export async function rejectRoleProposal(roleId: string, adminId: string, reason?: string) {
  const { data, error } = await supabase.from("catalog_roles")
    .update({
      status: "rejected",
      reject_reason: reason ?? null,
      is_active: false,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", roleId).eq("status", "pending")
    .select().single();
  if (error?.code === "PGRST116") {
    throw new NotFoundError("No pending role proposal with that id", "PROPOSAL_NOT_FOUND");
  }
  if (error) throw new InternalError(error.message);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHALLENGES
// ═══════════════════════════════════════════════════════════════════════════

export interface ListChallengesOptions {
  activeOnly?: boolean;
  approvedOnly?: boolean;
  proposedBy?: string;
  catalogRoleId?: string;
  status?: "approved" | "pending" | "rejected";
}

export async function listChallenges(
  activeOrOpts: boolean | ListChallengesOptions = true
) {
  const opts: ListChallengesOptions =
    typeof activeOrOpts === "boolean"
      ? { activeOnly: activeOrOpts, approvedOnly: true }
      : { activeOnly: true, approvedOnly: true, ...activeOrOpts };

  let q = supabase.from("challenges").select(`
    id, title, summary, is_active, status, proposed_by, created_at,
    catalog_roles(id, name),
    rubric_criteria(id, title, weight)
  `).order("created_at", { ascending: false });

  if (opts.activeOnly) q = q.eq("is_active", true);
  if (opts.approvedOnly) q = q.eq("status", "approved");
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.proposedBy) q = q.eq("proposed_by", opts.proposedBy);
  if (opts.catalogRoleId) q = q.eq("catalog_role_id", opts.catalogRoleId);

  const { data, error } = await q;
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function getChallenge(id: string) {
  const { data, error } = await supabase.from("challenges").select(`
    id, title, summary, scenario, deliverables,
    submission_format, constraints_text, submission_requirements,
    is_active, status, proposed_by, reject_reason,
    created_at, updated_at,
    catalog_roles(id, name),
    rubric_criteria(id, title, description, weight, sort_order)
  `).eq("id", id).single();
  if (error?.code === "PGRST116") throw new NotFoundError("Challenge not found", "CHALLENGE_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

// FIX (C4): Employer view must filter out inactive + non-approved challenges.
export async function getApprovedActiveChallenge(id: string) {
  const { data, error } = await supabase.from("challenges").select(`
    id, title, summary, scenario, deliverables,
    submission_format, constraints_text, submission_requirements,
    is_active, status, created_at, updated_at,
    catalog_roles(id, name),
    rubric_criteria(id, title, description, weight, sort_order)
  `).eq("id", id)
    .eq("is_active", true)
    .eq("status", "approved")
    .single();
  if (error?.code === "PGRST116") throw new NotFoundError("Challenge not found or unavailable", "CHALLENGE_NOT_FOUND");
  if (error) throw new InternalError(error.message);
  return data;
}

export async function createChallenge(input: {
  catalog_role_id: string;
  title: string;
  summary?: string;
  scenario?: string;
  deliverables?: string[];
  submission_format?: string;
  constraints_text?: string;
  submission_requirements?: string;
  created_by: string;
  status?: "approved" | "pending";
  proposed_by?: string | null;
  rubric_criteria?: { title: string; description?: string; weight: number; sort_order?: number }[];
}) {
  // When an employer proposes a challenge against a pending role, that's fine —
  // both move together through the approval queue. But if they target an
  // existing catalog role, it must be approved.
  if (input.proposed_by) {
    const { data: parentRole, error: pe } = await supabase
      .from("catalog_roles")
      .select("status, proposed_by")
      .eq("id", input.catalog_role_id).single();
    if (pe?.code === "PGRST116") {
      throw new NotFoundError("catalog_role_id does not exist", "ROLE_NOT_FOUND");
    }
    if (pe) throw new InternalError(pe.message);
    // If the parent role is pending, only the proposer can attach challenges to it.
    if (parentRole.status === "pending" && parentRole.proposed_by !== input.proposed_by) {
      throw new ForbiddenError(
        "Cannot propose a challenge under another employer's pending role",
        "ROLE_NOT_OWNED"
      );
    }
    if (parentRole.status === "rejected") {
      throw new ForbiddenError("Cannot attach challenge to a rejected role", "ROLE_REJECTED");
    }
  }

  const { rubric_criteria, ...challengeData } = input;
  const { data: ch, error } = await supabase.from("challenges")
    .insert({
      ...challengeData,
      status: input.status ?? "approved",
      proposed_by: input.proposed_by ?? null,
    })
    .select().single();
  if (error) throw new InternalError(error.message);

  if (rubric_criteria?.length) {
    const total = rubric_criteria.reduce((s, c) => s + c.weight, 0);
    if (total !== 100) throw new InternalError("Rubric criteria weights must sum to 100");
    const criteria = rubric_criteria.map((c, i) => ({
      challenge_id: ch.id, ...c, sort_order: c.sort_order ?? i,
    }));
    const { error: re } = await supabase.from("rubric_criteria").insert(criteria);
    if (re) throw new InternalError(re.message);
  }
  return getChallenge(ch.id);
}

export async function updateChallenge(id: string, input: {
  title?: string;
  summary?: string;
  scenario?: string;
  deliverables?: string[];
  submission_format?: string;
  constraints_text?: string;
  submission_requirements?: string;
  is_active?: boolean;
  rubric_criteria?: { id?: string; title: string; description?: string; weight: number; sort_order?: number }[];
}) {
  const { rubric_criteria, ...challengeData } = input;
  if (Object.keys(challengeData).length) {
    const { error } = await supabase.from("challenges")
      .update({ ...challengeData, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new InternalError(error.message);
  }
  if (rubric_criteria !== undefined) {
    if (rubric_criteria.length > 0) {
      const total = rubric_criteria.reduce((s, c) => s + c.weight, 0);
      if (total !== 100) throw new InternalError("Rubric criteria weights must sum to 100");
    }
    // Replace-all semantics (simpler than capability diff; rubric ids are
    // snapshotted into job_requests at publish time so there's nothing to
    // preserve long-term)
    await supabase.from("rubric_criteria").delete().eq("challenge_id", id);
    if (rubric_criteria.length > 0) {
      const criteria = rubric_criteria.map((c, i) => ({
        challenge_id: id,
        title: c.title,
        description: c.description,
        weight: c.weight,
        sort_order: c.sort_order ?? i,
      }));
      const { error: re } = await supabase.from("rubric_criteria").insert(criteria);
      if (re) throw new InternalError(re.message);
    }
  }
  return getChallenge(id);
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw new InternalError(error.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYER-PROPOSED CHALLENGES (B2) — Admin approval workflow
// ═══════════════════════════════════════════════════════════════════════════

export async function approveChallengeProposal(challengeId: string, adminId: string) {
  const { data, error } = await supabase.from("challenges")
    .update({
      status: "approved",
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", challengeId).eq("status", "pending")
    .select().single();
  if (error?.code === "PGRST116") {
    throw new NotFoundError("No pending challenge proposal with that id", "PROPOSAL_NOT_FOUND");
  }
  if (error) throw new InternalError(error.message);
  return data;
}

export async function rejectChallengeProposal(challengeId: string, adminId: string, reason?: string) {
  const { data, error } = await supabase.from("challenges")
    .update({
      status: "rejected",
      reject_reason: reason ?? null,
      is_active: false,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", challengeId).eq("status", "pending")
    .select().single();
  if (error?.code === "PGRST116") {
    throw new NotFoundError("No pending challenge proposal with that id", "PROPOSAL_NOT_FOUND");
  }
  if (error) throw new InternalError(error.message);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: Pending proposals queue
// ═══════════════════════════════════════════════════════════════════════════

export async function listPendingRoleProposals() {
  const { data, error } = await supabase.from("catalog_roles").select(`
    id, name, description, status, proposed_by, created_at,
    catalog_skill_levels(id, level),
    catalog_capabilities(id, title, summary),
    users!proposed_by(id, email, first_name, last_name)
  `).eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}

export async function listPendingChallengeProposals() {
  const { data, error } = await supabase.from("challenges").select(`
    id, title, summary, status, proposed_by, created_at,
    catalog_roles(id, name, status),
    rubric_criteria(id, title, description, weight, sort_order),
    users!proposed_by(id, email, first_name, last_name)
  `).eq("status", "pending").order("created_at", { ascending: false });
  if (error) throw new InternalError(error.message);
  return data ?? [];
}
