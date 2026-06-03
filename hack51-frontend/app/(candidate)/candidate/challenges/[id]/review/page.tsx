"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { EmployerRequest } from "@/types/employer";
import { toast } from "react-toastify";
import { challengeService } from "@/lib/services/challenge.service";
import { submissionService } from "@/lib/services/submission.service";

const declarations = [
  {
    id: "original",
    label: "Original Work Guarantee",
    text: "I declare that the submitted artifacts are my own original creation, except where explicitly permitted by the challenge disclosure rules.",
    defaultChecked: true,
  },
  {
    id: "compliance",
    label: "Compliance with rules",
    text: "I confirm I have adhered strictly to the format requirements and operational constraints outlined in the challenge brief.",
    defaultChecked: true,
  },
  {
    id: "evaluation",
    label: "Evaluation Permission",
    text: "I grant Hack51 expert reviewers and the employer permission to access, view, and score my artifacts for the purpose of this request.",
    defaultChecked: false,
  },
];

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-white-50/80 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl p-10 w-full max-w-md flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Submission Successful
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Track your submission status in the submissions dashboard.
        </p>
        <Link href="/candidate/submissions">
          <button
            onClick={onClose}
            className="w-full bg-[#FF1F5A] hover:bg-[#e01550] text-white font-semibold py-3 px-8 rounded-lg text-sm transition-colors"
          >
            Go to Submissions
          </button>
        </Link>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const [checks, setChecks] = useState<Record<string, boolean>>({
    original: true,
    compliance: true,
    evaluation: false,
  });
  const [challenge, setChallenge] = useState<EmployerRequest | null>(null);
  const [submissionData, setSubmissionData] = useState<{
    submission_statement: string;
    artifact_urls: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const params = useParams();
  const id = params.id as string;

  const toggle = (id: string) =>
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const submissionData = sessionStorage.getItem("submission_data");
    if (submissionData) {
      setSubmissionData(JSON.parse(submissionData));
    }
  }, []);

  const artifactUrls = submissionData?.artifact_urls || [];
  const statement = submissionData?.submission_statement || "";

  useEffect(() => {
    const fetchChallengeById = async () => {
      setLoading(true);
      try {
        const response =
          await challengeService.getCandidateChallengeDetails(id);
        setChallenge(response.data);
      } catch (err) {
        toast.error("Failed to fetch challenge details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChallengeById();
  }, [id]);

  const handleConfirmSubmission = async () => {
    if (!artifactUrls) {
      toast.error(
        "Artifact URL is required. Please go back and provide your link.",
      );
      return;
    }

    if (!checks.original || !checks.compliance || !checks.evaluation) {
      toast.error("Please agree to all declarations before submitting.");
      return;
    }

    setLoading(true);
    try {
      await submissionService.submitArtifact(id, {
        artifact_urls: artifactUrls,
        artifact_type: "link",
        submission_statement: statement,
        integrity_declared:
          checks.original && checks.compliance && checks.evaluation,
      });
      setShowSuccess(true);
    } catch (err: any) {
      toast.error(
        typeof err === "string" ? err : "Failed to submit your challenge.",
      );
      console.error("Submit error", err);
    } finally {
      setLoading(false);
      sessionStorage.removeItem("submission_data");
    }
  };

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      }
    >
      <>
        {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}

        <div className="mb-2">
          <Link
            href={`/candidate/challenges/${id}/submit`}
            className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#FF1F5A] transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Back to submission manifest
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {challenge?.title}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {challenge?.role_level}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Submission Review
            </h2>
            <button
              onClick={handleConfirmSubmission}
              disabled={loading}
              className="bg-[#FF1F5A] hover:bg-[#e01550] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Submitting..." : "Confirm Submission"}
            </button>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 text-base mb-0.5">
              {challenge?.role_level ?? "Candidate submission"}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Request ID: {challenge?.id || id}
            </p>

            <h4 className="font-semibold text-gray-800 text-sm mb-2">
              Summary & artifacts
            </h4>
            <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                {statement || "No submission summary provided."}
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Artifact link
              </p>
              {artifactUrls.length > 0 ? (
                artifactUrls.map((url: string, index: number) => (
                  <ul>
                    <li>
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[#FF1F5A] break-all"
                      >
                        {url}
                      </a>
                    </li>
                  </ul>
                ))
              ) : (
                <p className="text-sm text-gray-500">No link provided.</p>
              )}
            </div>

            <div className="inline-flex items-center gap-2 border border-[#FF1F5A] bg-red-50 text-[#FF1F5A] text-xs font-medium px-3 py-1.5 rounded-full">
              <CheckCircle2 size={13} /> Artifact link(s) provided
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 text-base mb-4">
              Integrity Declarations (Mandatory)
            </h3>
            <div className="space-y-3">
              {declarations.map((d) => (
                <div
                  key={d.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-start gap-3 cursor-pointer hover:border-gray-300 transition-colors"
                  onClick={() => toggle(d.id)}
                >
                  <div
                    className={`w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center border-2 transition-colors ${
                      checks[d.id]
                        ? "bg-[#FF1F5A] border-[#FF1F5A]"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {checks[d.id] && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm mb-0.5">
                      {d.label}
                    </p>
                    <p className="text-sm text-gray-500">{d.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    </Suspense>
  );
}
