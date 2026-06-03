"use client";
import Link from "next/link";
import { ArrowLeft, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { EmployerRequest } from "@/types/employer";
import { challengeService } from "@/lib/services/challenge.service";
import { useParams } from "next/navigation";
import { formatDate } from "@/lib/globalFunction";

export default function ChallengeDetailPage() {
  const [challenge, setChallenge] = useState<EmployerRequest | null>(null);

  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const fetchChallengeById = async () => {
      try {
        const response =
          await challengeService.getCandidateChallengeDetails(id);
        setChallenge(response.data);
      } catch (err) {
        console.error("Failed to fetch challenge details:", err);
      }
    };
    fetchChallengeById();
  }, [id]);

  return (
    <>
      <div className="mb-2">
        <Link
          href="/candidate/challenges"
          className="text-sm text-gray-500 flex items-center gap-1 hover:text-[#FF1F5A] transition-colors mb-3"
        >
          <ArrowLeft size={14} /> Back to Find challenges
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{challenge?.title}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{challenge?.role_level}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mt-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Noname Company</h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-sm text-[#FF1F5A] font-medium">
                Open for submissions
              </span>
              <span className="text-sm text-gray-500">
                Closing{" "}
                <span className="text-[#FF1F5A] font-semibold">
                  {formatDate(challenge?.deadline ?? "-")}
                </span>
              </span>
            </div>
          </div>
          <Link href={`/candidate/challenges/${params.id}/submit`}>
            <button className="flex items-center gap-2 bg-[#FF1F5A] hover:bg-[#e01550] text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
              Start submission <Flame size={15} />
            </button>
          </Link>
        </div>

        {/* Challenge Title */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-500 mb-2">
            Challenge Title
          </p>

          <p className="text-sm text-gray-700 ">
            {challenge?.challenges?.title}
          </p>
        </div>

        {/* Scenario */}
        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-500 mb-2">Scenario</p>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 italic">
              {challenge?.challenges?.scenario}
            </p>
          </div>
        </div>

        {/* Deliverables + Format */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-[#FF1F5A] flex items-center justify-center">
                <span className="text-white text-[10px]">≡</span>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Required Deliverables
              </h3>
            </div>
            <ul className="space-y-2">
              {challenge?.challenges?.deliverables.map((deliver) => (
                <li
                  key={deliver}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF1F5A] shrink-0" />
                  {deliver}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-[#FF1F5A] flex items-center justify-center">
                <span className="text-white text-[10px]">▣</span>
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">
                Format and Rules
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Submission Format
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {challenge?.challenges?.submission_format}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Constraints
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {challenge?.challenges?.submission_requirements}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tooling Requirements */}
        <div className="border border-[#FF1F5A] bg-red-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#FF1F5A] mb-2">
            Tooling Requirements
          </h3>
          <p className="text-sm text-[#FF1F5A]">
            {challenge?.challenges?.constraints_text}
          </p>
        </div>
      </div>
    </>
  );
}
