import { z } from "zod";

// Rubric criterion as sent by the employer when overriding the challenge rubric.
// `id` is optional — the employer can either reference an existing criterion
// (to preserve the title/weight but tweak description) or omit it entirely for
// brand-new criteria. Validation rule: weights must sum to 100 at publish time.
const CustomRubricCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  weight: z.number().int().min(1).max(100),
  sort_order: z.number().int().optional(),
});

export const CreateRequestSchema = z.object({
  title: z.string().min(1).max(200),
  role_type: z.string().max(100).optional(),
  role_level: z.enum(["entry-level", "mid-level", "senior"]).optional(),
  challenge_id: z.string().uuid().optional(),
  challenge_cap: z.number().int().min(1).max(500).optional(),
  shortlist_size: z.number().int().min(1).max(50).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  /**
   * Per-request rubric override (Concept Note §6.2). When provided, replaces
   * the challenge's default rubric for this request only. Weights must sum
   * to exactly 100. Validated by the application layer before publish.
   */
  custom_rubric: z.array(CustomRubricCriterionSchema).optional(),
}).refine((data) => {
  if (!data.custom_rubric) return true;
  const total = data.custom_rubric.reduce((s, c) => s + c.weight, 0);
  return total === 100;
}, { message: "custom_rubric weights must sum to exactly 100" });

export const UpdateRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  role_type: z.string().max(100).optional(),
  role_level: z.enum(["entry-level", "mid-level", "senior"]).optional(),
  challenge_id: z.string().uuid().optional(),
  challenge_cap: z.number().int().min(1).max(500).optional(),
  shortlist_size: z.number().int().min(1).max(50).optional(),
  deadline: z.string().datetime({ offset: true }).optional(),
  custom_rubric: z.array(CustomRubricCriterionSchema).optional(),
}).refine((data) => {
  if (!data.custom_rubric) return true;
  const total = data.custom_rubric.reduce((s, c) => s + c.weight, 0);
  return total === 100;
}, { message: "custom_rubric weights must sum to exactly 100" });

export const SubmitSchema = z.object({
  artifact_urls: z.array(z.string().url()).min(1).max(10),
  artifact_type: z.enum(["link", "upload", "both"]),
  submission_statement: z.string().max(2000).optional(),
  integrity_declared: z.literal(true, { errorMap: () => ({ message: "You must declare integrity to submit" }) }),
});

export const TriageSchema = z.object({
  decision: z.enum(["valid", "invalid", "returned"]),
  reason: z.string().max(1000).optional(),
});

export const ScoreSchema = z.object({
  scores: z.array(z.object({
    criterion_id: z.string().uuid(),
    criterion_title: z.string(),
    weight: z.number().int().min(1).max(100),
    score_percent: z.number().int().min(0).max(100),
  })).min(1),
  reviewer_notes: z.string().max(2000).optional(),
});

export const ConfirmShortlistSchema = z.object({
  selections: z.array(z.object({
    candidate_id: z.string().uuid(),
    submission_id: z.string().uuid(),
    rank: z.number().int().min(1),
  })).min(1),
});

export const UpdateProfileSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  old_password: z.string().optional(),
  new_password: z.string().min(8).max(128)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/).optional(),
});

export type CreateRequestInput    = z.infer<typeof CreateRequestSchema>;
export type UpdateRequestInput    = z.infer<typeof UpdateRequestSchema>;
export type SubmitInput           = z.infer<typeof SubmitSchema>;
export type TriageInput           = z.infer<typeof TriageSchema>;
export type ScoreInput            = z.infer<typeof ScoreSchema>;
export type ConfirmShortlistInput = z.infer<typeof ConfirmShortlistSchema>;
export type UpdateProfileInput    = z.infer<typeof UpdateProfileSchema>;
