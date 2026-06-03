"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2, PlusCircle, ArrowLeftIcon } from "lucide-react";
import { CreateChallengeWithRubric } from "@/types/catalog";
import { challengeService } from "@/lib/services/challenge.service";
import DeleteModal from "../../../components/DeleteModal";
import { toast } from "react-toastify";

type ChallengeForm = CreateChallengeWithRubric & { id?: string };

const EMPTY_FORM: ChallengeForm = {
  catalog_role_id: "",
  title: "",
  summary: "",
  scenario: "",
  deliverables: [],
  submission_format: "",
  constraints_text: "",
  submission_requirements: "",
};

export default function ChallengeEditorClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogRoleId = searchParams.get("catalog_role_id") ?? "";
  const idParam = params.id as string;
  const isNew = idParam === "new";

  const [form, setForm] = useState<ChallengeForm>({
    ...EMPTY_FORM,
    catalog_role_id: catalogRoleId,
  });
  const [deliverableInput, setDeliverableInput] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;
    challengeService
      .getChallengeById(idParam)
      .then((res) => setForm(res.data))
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [idParam, isNew]);

  const backToList = () => {
    router.push(`/admin/catalog/challenges?catalog_role_id=${catalogRoleId}`);
  };

  const handleSave = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      if (isNew) {
        await challengeService.createChallenge({
          ...form,
          catalog_role_id: catalogRoleId,
          rubric_criteria: [
            {
              title: "Code Quality",
              description: "Code patterns, readability, maintainability",
              weight: 34,
            },
            {
              title: "Code Technicality",
              description: "Technical depth and architectural decisions",
              weight: 33,
            },
            {
              title: "Code Functionality",
              description: "Does it work correctly and efficiently",
              weight: 33,
            },
          ],
        });
      } else {
        await challengeService.updateChallenge(form.id!, {
          title: form.title,
          summary: form.summary,
          scenario: form.scenario,
          deliverables: form.deliverables,
          submission_format: form.submission_format,
          submission_requirements: form.submission_requirements,
          constraints_text: form.constraints_text,
        });
      }
      backToList();
    } catch (err) {
      console.error("Error saving challenge:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await challengeService.deleteChallenge(form.id!);
      backToList();
    } catch (err) {
      console.error("Error deleting challenge:", err);
    }
  };

  const handleAddDeliverable = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!deliverableInput.trim()) return;
    setForm((prev) => ({
      ...prev,
      deliverables: [...prev.deliverables, deliverableInput.trim()],
    }));
    if (form.deliverables.length >= 3) {
      toast.info("Maximum of 3 deliverables allowed.");
    }
    setDeliverableInput("");
  };

  const handleRemoveDeliverable = (index: number) => {
    setForm((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((_, i) => i !== index),
    }));
  };

  if (loading) return <p className="p-8 text-sm text-gray-500">Loading...</p>;

  return (
    <main className="w-full">
      <span
        onClick={backToList}
        className="cursor-pointer hover:text-red-700 mb-4 text-sm text-gray-500 flex items-center gap-1 w-fit"
      >
        <ArrowLeftIcon size={14} />
        Back to Challenges
      </span>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Challenge editor</h2>
        <div className="flex gap-3">
          {!isNew && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trash2 size={14} />
              Delete challenge
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#FF0046] hover:bg-[#c0144a] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save & continue"}
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Challenge title
          </label>
          <input
            value={form.title ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Enter title"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Challenge summary
          </label>
          <textarea
            rows={4}
            value={form.summary ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, summary: e.target.value }))
            }
            placeholder="Enter summary"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Scenario</label>
          <textarea
            rows={4}
            value={form.scenario ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, scenario: e.target.value }))
            }
            placeholder="Write a scenario"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Deliverables</label>
          <div className="space-y-2">
            {form.deliverables.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const updated = [...form.deliverables];
                    updated[index] = e.target.value;
                    setForm((prev) => ({ ...prev, deliverables: updated }));
                  }}
                  className="flex-1 border border-gray-200 bg-gray-50 px-4 py-2 rounded-lg outline-none focus:ring-2 focus:ring-red-200 text-sm"
                />
                <button
                  onClick={() => handleRemoveDeliverable(index)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="relative mt-2">
              <PlusCircle
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Add Deliverable"
                value={deliverableInput}
                onChange={(e) => setDeliverableInput(e.target.value)}
                onKeyDown={handleAddDeliverable}
                className="border border-dashed border-gray-300 rounded-full px-4 py-2 pl-9 text-sm outline-none focus:ring-2 focus:ring-red-200 w-full"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Submission Requirements
          </label>
          <textarea
            rows={3}
            value={form.submission_requirements ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                submission_requirements: e.target.value,
              }))
            }
            placeholder="Describe submission requirements"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Submission Format
          </label>
          <input
            value={form.submission_format ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                submission_format: e.target.value,
              }))
            }
            placeholder="e.g. Single ZIP or public GitHub link"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tooling Requirements & Restrictions
          </label>
          <textarea
            rows={3}
            value={form.constraints_text ?? ""}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, constraints_text: e.target.value }))
            }
            placeholder="Any constraints or restrictions"
            className="w-full border border-gray-200 bg-gray-50 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>
      </div>

      <DeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </main>
  );
}
