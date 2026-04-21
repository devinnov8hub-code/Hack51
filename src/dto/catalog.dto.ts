import { z } from "zod";

// ─── Shared sub-schemas ─────────────────────────────────────────────────────

const SkillLevelEnum = z.enum(["entry-level", "mid-level", "senior"]);

const CapabilityInputSchema = z.object({
  id: z.string().uuid().optional(),   // present when updating an existing capability
  title: z.string().min(1).max(200),
  summary: z.string().max(1000).optional(),
});

const RubricCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  weight: z.number().int().min(1).max(100),
  sort_order: z.number().int().optional(),
});

function weightsSumTo100<T extends { rubric_criteria?: { weight: number }[] | undefined }>(
  data: T
): boolean {
  if (!data.rubric_criteria) return true;
  const total = data.rubric_criteria.reduce((s, c) => s + c.weight, 0);
  return total === 100;
}

// ─── ADMIN: CATALOG ROLES ───────────────────────────────────────────────────

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  skill_levels: z.array(SkillLevelEnum).min(1).optional(),
  capabilities: z.array(CapabilityInputSchema).optional(),
});

/**
 * FIX (A1/A2): PUT /admin/catalog/roles/{id} now accepts the same payload shape
 * as POST, so the frontend can send skill_levels + capabilities when editing.
 * The repository layer is responsible for the diff/upsert/delete semantics.
 */
export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  skill_levels: z.array(SkillLevelEnum).optional(),     // pass [] to clear
  capabilities: z.array(CapabilityInputSchema).optional(), // pass [] to clear
});

// ─── ADMIN: CATALOG CHALLENGES ──────────────────────────────────────────────

export const CreateChallengeSchema = z.object({
  catalog_role_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  summary: z.string().max(1000).optional(),
  scenario: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  submission_format: z.string().optional(),
  constraints_text: z.string().optional(),
  submission_requirements: z.string().optional(),
  rubric_criteria: z.array(RubricCriterionSchema).min(1),
}).refine(weightsSumTo100, { message: "Rubric criteria weights must sum to exactly 100" });

export const UpdateChallengeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(1000).optional(),
  scenario: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  submission_format: z.string().optional(),
  constraints_text: z.string().optional(),
  submission_requirements: z.string().optional(),
  is_active: z.boolean().optional(),
  rubric_criteria: z.array(RubricCriterionSchema).optional(),
}).refine(weightsSumTo100, { message: "Rubric criteria weights must sum to exactly 100" });

// ─── EMPLOYER: PROPOSE CUSTOM ROLE (B1) ──────────────────────────────────────
// Employers can propose a role that's not in the admin-curated catalog.
// Created with status='pending' — invisible to other employers until admin approves.

export const ProposeRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  skill_levels: z.array(SkillLevelEnum).min(1).optional(),
  capabilities: z.array(CapabilityInputSchema).optional(),
});

// ─── EMPLOYER: PROPOSE CUSTOM CHALLENGE (B2) ─────────────────────────────────
// Employers can propose a new challenge under a role they own-proposed or an
// approved catalog role. Same shape as admin CreateChallenge. Status='pending'.

export const ProposeChallengeSchema = z.object({
  catalog_role_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  summary: z.string().max(1000).optional(),
  scenario: z.string().optional(),
  deliverables: z.array(z.string()).optional(),
  submission_format: z.string().optional(),
  constraints_text: z.string().optional(),
  submission_requirements: z.string().optional(),
  rubric_criteria: z.array(RubricCriterionSchema).min(1),
}).refine(weightsSumTo100, { message: "Rubric criteria weights must sum to exactly 100" });

// ─── ADMIN: REVIEW EMPLOYER PROPOSALS ────────────────────────────────────────

export const ReviewProposalSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(1000).optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────
export type CreateRoleInput       = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput       = z.infer<typeof UpdateRoleSchema>;
export type CreateChallengeInput  = z.infer<typeof CreateChallengeSchema>;
export type UpdateChallengeInput  = z.infer<typeof UpdateChallengeSchema>;
export type ProposeRoleInput      = z.infer<typeof ProposeRoleSchema>;
export type ProposeChallengeInput = z.infer<typeof ProposeChallengeSchema>;
export type ReviewProposalInput   = z.infer<typeof ReviewProposalSchema>;
