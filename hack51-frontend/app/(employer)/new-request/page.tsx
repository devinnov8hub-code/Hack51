"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepContent, {
  stepConfig,
} from "@/app/(employer)/components/StepContent";
import StepIndicator from "@/app/(employer)/components/StepIndicator";
import { useRequestStore } from "@/lib/context/useRequestStore";
import { employerService } from "@/lib/services/employer.service";
import { ArrowLeftIcon } from "lucide-react";

export default function NewRequestPage() {
  const router = useRouter();
  const {
    step,
    nextStep,
    prevStep,
    reset,
    role,
    role_level,
    challenge,
    challenge_cap,
    shortlist_size,
    deadline,
  } = useRequestStore();
  const [submitting, setSubmitting] = useState<"draft" | "publish" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!role || !challenge) {
      setError("Please select a role and challenge before submitting.");
      return false;
    }
    const hasSkillLevels = (role.catalog_skill_levels?.length ?? 0) > 0;
    if (hasSkillLevels && !role_level) {
      setError("Please select a skill level before submitting.");
      return false;
    }
    if (!deadline) {
      setError("Please set a challenge deadline in the Request Preview step.");
      return false;
    }
    return true;
  };

  const handleSaveAsDraft = async () => {
    if (!validate()) return;
    setSubmitting("draft");
    setError(null);

    try {
      const buildPayload = {
        title: role!.name,
        role_type: role!.id,
        challenge_id: challenge!.id,
        challenge_cap,
        shortlist_size,
        deadline: new Date(deadline!).toISOString(),
        ...(role_level?.level ? { role_level: role_level.level } : {}),
      };

      await employerService.createRequest(buildPayload);
      nextStep();
    } catch (err: any) {
      setError(err?.message ?? "Failed to save draft. Please try again.");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div>
      <span
        onClick={() => router.push("/requests")}
        className="cursor-pointer hover:text-red-700 my-5 text-sm text-gray-500"
      >
        <ArrowLeftIcon className="inline-block mr-1" />
        Back to requests
      </span>
      <section className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-4">New Request</h1>
          <p className="text-gray-600 mb-6">
            Create a new hiring request to find the best candidates for your
            team.
          </p>
        </div>
        <div>
          <button
            className="bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg"
            onClick={() => router.push("./custom-request")}
          >
            Create Custom Request
          </button>
        </div>
      </section>

      <StepIndicator currentStep={step} />
      <StepContent step={step} />

      {error && <p className="text-red-600 text-sm mt-4 text-right">{error}</p>}

      <div className="flex justify-end mt-6">
        {step > 1 && step < stepConfig.length && (
          <button
            onClick={prevStep}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg"
          >
            Previous
          </button>
        )}

        {step < stepConfig.length - 1 && (
          <button
            onClick={nextStep}
            className="bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg ml-4"
          >
            Next
          </button>
        )}

        {step === stepConfig.length - 1 && (
          <>
            <button
              onClick={handleSaveAsDraft}
              disabled={submitting !== null}
              className="  border border-[#FF0046] hover:bg-[#FF0046] hover:text-white disabled:opacity-60 text-[#FF0046] font-bold py-2 px-4 rounded-lg ml-4"
            >
              {submitting === "draft"
                ? "Creating Request..."
                : "Submit Request"}
            </button>
          </>
        )}

        {step === stepConfig.length && (
          <button
            onClick={() => {
              reset();
              router.push("/requests");
            }}
            className="bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg ml-4"
          >
            Go to Requests
          </button>
        )}
      </div>
    </div>
  );
}
