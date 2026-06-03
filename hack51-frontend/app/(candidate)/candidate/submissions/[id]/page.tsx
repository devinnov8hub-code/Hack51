"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { SubmissionFullDetail } from "@/types/submissions";
import { useEffect, useState } from "react";
import { submissionService } from "@/lib/services/submission.service";
import { toast } from "react-toastify";
import { useParams } from "next/navigation";

export default function ShortlistPage() {
  const [submission, setSubmission] =
    useState<SubmissionFullDetail | null>(null);

  const [loading, setLoading] = useState(false);

  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const fetchSubmissionById = async () => {
      setLoading(true);

      try {
        const response =
          await submissionService.getCandidateSubmissionById(id);

        setSubmission(response);
      } catch (err: any) {
        toast.error(
          err?.message || "Failed to fetch candidate submission",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionById();
  }, [id]);

  const isShortlisted = submission?.status === "shortlisted";

  return (
    <>
    {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
      <div className="mb-2">
        <Link
          href="/candidate/submissions"
          className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#FF1F5A] transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Back to Submissions
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">
          Application Status
        </h1>

        <p className="text-sm text-gray-400 mt-0.5">
          Track your active applications and historical performance.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
        {/* Status Banner */}
        <div
          className={`rounded-xl p-8 flex flex-col items-center text-center mb-6 ${
            isShortlisted ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              isShortlisted ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {isShortlisted ? (
              <CheckCircle2
                size={30}
                className="text-green-600"
              />
            ) : (
              <XCircle
                size={30}
                className="text-red-600"
              />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isShortlisted
              ? "Congratulations!"
              : "Application Unsuccessful"}
          </h2>

          <p className="text-sm text-gray-700 max-w-lg leading-6">
            {isShortlisted
              ? "Congratulations on being shortlisted. You've stood out among a highly competitive talent pool. Your profile is now being prioritized for the final hiring pipeline."
              : "Thank you for taking the time to apply. After careful review, your application was not selected for the next stage at this time. We encourage you to explore and apply for other opportunities that match your skills and experience."}
          </p>

          {!isShortlisted && (
            <Link
              href="/candidate/challenges"
              className="mt-6 inline-flex items-center justify-center px-5 py-3 rounded-lg bg-[#FF1F5A] text-white text-sm font-medium hover:opacity-90 transition"
            >
              Back to Challenges
            </Link>
          )}
        </div>

        {/* Company Info */}
        <div className="mb-6">
          <h3 className="font-bold text-gray-900 text-base mb-4">
            Noname Company
          </h3>

          <div>
            <p className="text-sm text-gray-500 mb-0.5">
              Role:
            </p>

            <p className="font-bold text-gray-900">
              {submission?.job_requests?.title || "—"}
            </p>

            <p className="text-sm text-gray-400 mt-0.5">
              {submission?.job_requests?.id}
            </p>
          </div>
        </div>

        {/* Invitation / Feedback Box */}
        <div
          className={`rounded-lg p-4 border ${
            isShortlisted
              ? "border-blue-300 bg-blue-50"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <p
            className={`text-sm font-semibold mb-2 ${
              isShortlisted
                ? "text-blue-600"
                : "text-gray-700"
            }`}
          >
            {isShortlisted
              ? "Invitation Request"
              : "Keep Exploring"}
          </p>

          <div
            className={`pt-2 ${
              isShortlisted
                ? "border-t border-blue-200"
                : "border-t border-gray-200"
            }`}
          >
            <p
              className={`text-sm ${
                isShortlisted
                  ? "text-blue-500"
                  : "text-gray-600"
              }`}
            >
              {isShortlisted
                ? "If selected, an invitation request will be sent by the employer to your email."
                : "New opportunities and challenges are added regularly. Keep building your profile and applying to roles that fit your strengths."}
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </>
  );
}