"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PlusCircle, Trash2 } from "lucide-react";
import { CreateChallengeWithRubric } from "@/types/catalog";
import { challengeService } from "@/lib/services/challenge.service";
import SuccessModal from "../../components/SuccessModal";

type RubricCriterion = { title: string; description: string; weight: number };
type ChallengeWithRubric = CreateChallengeWithRubric & {
  id: string;
  rubric_criteria: RubricCriterion[];
};

export default function RubricEditorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogRoleId = searchParams.get("catalog_role_id") ?? "";

  const [challenges, setChallenges] = useState<ChallengeWithRubric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (!catalogRoleId) return;
    challengeService
      .getChallenges({ catalog_role_id: catalogRoleId })
      .then((res) => {
        const all: ChallengeWithRubric[] = res.data ?? [];
        const filtered = all.filter(
          (c) =>
            (c as any).catalog_roles?.id === catalogRoleId ||
            c.catalog_role_id === catalogRoleId,
        );
        setChallenges(
          filtered.map((c) => ({
            ...c,
            rubric_criteria: c.rubric_criteria?.length
              ? c.rubric_criteria
              : [{ title: "", description: "", weight: 0 }],
          })),
        );
      })
      .catch(() => setChallenges([]))
      .finally(() => setLoading(false));
  }, [catalogRoleId]);

  const updateCriterion = (
    challengeIdx: number,
    criterionIdx: number,
    field: keyof RubricCriterion,
    value: string | number,
  ) => {
    setChallenges((prev) =>
      prev.map((ch, ci) => {
        if (ci !== challengeIdx) return ch;
        const updated = ch.rubric_criteria.map((cr, ri) =>
          ri === criterionIdx ? { ...cr, [field]: value } : cr,
        );
        return { ...ch, rubric_criteria: updated };
      }),
    );
  };

  const addCriterion = (challengeIdx: number) => {
    setChallenges((prev) =>
      prev.map((ch, ci) =>
        ci !== challengeIdx
          ? ch
          : {
              ...ch,
              rubric_criteria: [
                ...ch.rubric_criteria,
                { title: "", description: "", weight: 0 },
              ],
            },
      ),
    );
  };

  const removeCriterion = (challengeIdx: number, criterionIdx: number) => {
    setChallenges((prev) =>
      prev.map((ch, ci) => {
        if (ci !== challengeIdx) return ch;
        return {
          ...ch,
          rubric_criteria: ch.rubric_criteria.filter(
            (_, ri) => ri !== criterionIdx,
          ),
        };
      }),
    );
  };

  const totalWeight = (criteria: RubricCriterion[]) =>
    criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);

  const handleSave = async () => {
    const invalid = challenges.find(
      (ch) => totalWeight(ch.rubric_criteria) !== 100,
    );
    if (invalid) {
      alert(`Scoring weights for "${invalid.title}" must add up to 100%.`);
      return;
    }
    const incomplete = challenges.find((ch) =>
      ch.rubric_criteria.some((c) => !c.title.trim() || !c.description.trim()),
    );
    if (incomplete) {
      alert(
        `Please fill in all criterion titles and descriptions for "${incomplete.title}".`,
      );
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        challenges.map((ch) =>
          challengeService.updateChallenge(ch.id, {
            ...ch,
            rubric_criteria: ch.rubric_criteria,
          }),
        ),
      );
      setSuccessOpen(true);
    } catch (err) {
      console.error("Error saving rubric:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="w-full">
        <span
          onClick={() =>
            router.push(
              `/admin/catalog/challenges?catalog_role_id=${catalogRoleId}`,
            )
          }
          className="cursor-pointer hover:text-red-700 my-5 text-sm text-gray-500 flex items-center gap-1 w-fit"
        >
          <ArrowLeftIcon size={14} />
          Back to Challenges
        </span>

        <div className="flex justify-between items-start mt-2 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Catalog</h1>
            <p className="text-gray-500 text-sm">Manage roles and challenges</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#FF0046] hover:bg-[#c0144a] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Role"}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        ) : challenges.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No challenges found for this role.
          </p>
        ) : (
          <div className="space-y-6">
            {challenges.map((challenge, ci) => {
              const total = totalWeight(challenge.rubric_criteria);
              const isValid = total === 100;
              return (
                <div
                  key={challenge.id}
                  className="bg-white p-8 rounded-xl shadow-md"
                >
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                    <div>
                      <h2 className="text-lg font-bold">{challenge.title}</h2>
                      <p className="text-gray-500 text-sm mt-0.5">
                        Rubric Editor
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold px-3 py-1 rounded-full ${
                        isValid
                          ? "bg-green-50 text-green-600"
                          : "bg-red-50 text-[#FF0046]"
                      }`}
                    >
                      Scoring Weight: {total}%{!isValid && " (must equal 100%)"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {challenge.rubric_criteria.map((criterion, ri) => (
                      <div
                        key={ri}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-5"
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <input
                            value={criterion.title}
                            onChange={(e) =>
                              updateCriterion(ci, ri, "title", e.target.value)
                            }
                            placeholder={`Criteria ${ri + 1}: Title`}
                            className="flex-1 font-semibold bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200"
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={criterion.weight}
                              onChange={(e) =>
                                updateCriterion(
                                  ci,
                                  ri,
                                  "weight",
                                  Number(e.target.value),
                                )
                              }
                              className="w-20 text-center bg-white border border-gray-200 px-2 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200"
                              placeholder="%"
                            />
                            <span className="text-sm text-gray-500">%</span>
                            {challenge.rubric_criteria.length > 1 && (
                              <button
                                onClick={() => removeCriterion(ci, ri)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          rows={3}
                          value={criterion.description}
                          onChange={(e) =>
                            updateCriterion(
                              ci,
                              ri,
                              "description",
                              e.target.value,
                            )
                          }
                          placeholder="e.g. This criterion evaluates whether the submitted code meets the specified requirements and functions correctly."
                          className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-200"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addCriterion(ci)}
                    className="mt-4 flex items-center gap-2 text-sm text-gray-500 hover:text-[#FF0046] transition-colors"
                  >
                    <PlusCircle size={16} />
                    Add criterion
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SuccessModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        onConfirm={() => setSuccessOpen(false)}
      />
    </>
  );
}
