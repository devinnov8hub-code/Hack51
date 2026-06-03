"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import EvaluationDetail from "@/app/(admin)/admin/components/EvaluationDetail";

export default function EvaluationPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;
  const submissionId = params.submissionId as string;

  return (
    <div>
      <span
        onClick={() => router.push(`/admin/review/${requestId}/submissions`)}
        className="cursor-pointer hover:text-red-700 my-5 text-sm text-gray-500"
      >
        <ArrowLeftIcon className="inline-block mr-1" />
        Back to submissions
      </span>
      <section className="flex justify-between mt-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Evaluation</h1>
          <p className="text-gray-600 text-sm mb-6">
            Evaluate requests and shortlist candidates
          </p>
        </div>
      </section>
      <EvaluationDetail id={submissionId}  />
    </div>
  );
}
