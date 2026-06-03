"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, PlusCircle, ChevronRight } from "lucide-react";
import { CreateChallengeWithRubric } from "@/types/catalog";
import { challengeService } from "@/lib/services/challenge.service";
import { catalogService } from "@/lib/services/catalog.service";

type ChallengeItem = CreateChallengeWithRubric & { id: string };

export default function ChallengesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catalogRoleId = searchParams.get("catalog_role_id") ?? "";

  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = async () => {
    if (!catalogRoleId) return;
    setLoading(true);
    try {
      const roleRes = await catalogService.getRoleById(catalogRoleId);
      const role = roleRes?.data ?? roleRes;
      const challengeIds: string[] = role?.challenges ?? [];

      const challRes = await challengeService.getChallenges();
      const all: ChallengeItem[] = challRes.data ?? [];

      const byRoleField = all.filter(
        (c) =>
          (c as any).catalog_roles?.id === catalogRoleId ||
          c.catalog_role_id === catalogRoleId ||
          (challengeIds.length > 0 && challengeIds.includes(c.id)),
      );
      setChallenges(byRoleField);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [catalogRoleId]);

  const handleCreateChallenge = () => {
    router.push(
      `/admin/catalog/challenges/new?catalog_role_id=${catalogRoleId}`,
    );
  };

  const handleEditChallenge = (id: string) => {
    router.push(
      `/admin/catalog/challenges/${id}?catalog_role_id=${catalogRoleId}`,
    );
  };

  return (
    <main className="w-full">
      <span
        onClick={() =>
          router.push(`/admin/catalog/roles/${catalogRoleId}/rolecapabilities`)
        }
        className="cursor-pointer hover:text-red-700 my-5 text-sm text-gray-500 flex items-center gap-1 w-fit"
      >
        <ArrowLeftIcon size={14} />
        Previous: Capabilities
      </span>

      <div className="flex justify-between items-start mt-2">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-gray-500 text-sm">Manage roles and challenges</p>
        </div>
        <button
          onClick={handleCreateChallenge}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF0046] hover:bg-[#c0144a] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <PlusCircle size={16} />
          Create new Challenge
        </button>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full mt-6">
        <h2 className="text-2xl font-bold mb-6">Challenges</h2>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        ) : challenges.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No challenge created for this role
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                onClick={() => handleEditChallenge(challenge.id)}
                className="border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-[#FF0046] hover:shadow-sm transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {challenge.title}
                    </h3>
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                      {challenge.summary}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-gray-400 group-hover:text-[#FF0046] ml-2 shrink-0 mt-0.5"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => {
            if (challenges.length === 0) {
              alert("Please create at least one challenge before continuing.");
              return;
            }
            router.push(
              `/admin/catalog/rubric?catalog_role_id=${catalogRoleId}`,
            );
          }}
          className="px-5 py-2.5 bg-[#FF0046] hover:bg-[#c0144a] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </main>
  );
}
