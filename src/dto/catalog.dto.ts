import { z } from "zod";

export const CreateRoleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  skill_levels: z.array(z.enum(["entry-level", "mid-level", "senior"])).min(1).optional(),
  capabilities: z.array(z.object({
    title: z.string().min(1),
    summary: z.string().optional(),
  })).optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

const RubricCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  weight: z.number().int().min(1).max(100),
  sort_order: z.number().int().optional(),
});

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
}).refine(data => {
  const total = data.rubric_criteria.reduce((s, c) => s + c.weight, 0);
  return total === 100;
}, { message: "Rubric criteria weights must sum to exactly 100" });

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
}).refine(data => {
  if (!data.rubric_criteria) return true;
  const total = data.rubric_criteria.reduce((s, c) => s + c.weight, 0);
  return total === 100;
}, { message: "Rubric criteria weights must sum to exactly 100" });

export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;
export type UpdateRoleInput = z.infer<typeof UpdateRoleSchema>;
export type CreateChallengeInput = z.infer<typeof CreateChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof UpdateChallengeSchema>;
