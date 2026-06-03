"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { catalogService } from "@/lib/services/catalog.service";
import { challengeService } from "@/lib/services/challenge.service";

type Capability = { title: string; summary: string };
type RubricCriterion = { title: string; description: string; weight: number };
type Challenge = {
  id: string;
  title: string;
  summary: string;
  scenario: string;
  deliverables: string[];
  submission_format: string;
  constraints_text: string;
  submission_requirements: string;
  rubric_criteria: RubricCriterion[];
};

export default function RoleViewPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [role, setRole] = useState<any>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const roleRes = await catalogService.getRoleById(id);
        const roleData = roleRes?.data ?? roleRes;
        setRole(roleData);

        const challengeIds: string[] = roleData?.challenges ?? [];
        if (challengeIds.length) {
          const challRes = await challengeService.getChallenges();
          const all: Challenge[] = challRes.data ?? [];
          setChallenges(
            all.filter(
              (c) =>
                challengeIds.includes(c.id) ||
                (c as any).catalog_roles?.id === id ||
                (c as any).catalog_role_id === id,
            ),
          );
        }
        
  if (!role)
    return <p className="p-8 text-sm text-gray-500">Role not found.</p>;
      } catch (err: any) {
        console.error("Error loading role view:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);


  const skillLevels: any[] = role?.catalog_skill_levels ?? [];
  const skillLabel = skillLevels
    .map((s) => (typeof s === "string" ? s : (s?.level ?? "")))
    .filter(Boolean)
    .join(", ");

  const capabilities: Capability[] =
    role?.catalog_capabilities ?? role?.capabilities ?? [];

  return (
    <main className="w-full">
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <span
            onClick={() => router.push("/admin/catalog/roles")}
            className="cursor-pointer hover:text-red-700 mb-6 text-sm text-gray-500 flex items-center gap-1 w-fit"
          >
            <ArrowLeftIcon size={14} />
            Back to Catalog
          </span>

          <div className="mb-6">
            <h1 className="text-2xl font-bold">{role.name}</h1>
            <p className="text-gray-500 text-sm">Role overview</p>
          </div>

          {/* Role Details */}
          <div className="bg-white p-8 rounded-xl shadow-md mb-6">
            <h2 className="text-lg font-bold border-b border-gray-200 pb-3 mb-5">
              Role Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Role Title
                </p>
                <p className="text-gray-800">{role.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Skill Level
                </p>
                <p className="text-gray-800 capitalize">
                  {skillLabel.replace(/-/g, " ") || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          {capabilities.length > 0 && (
            <div className="bg-white p-8 rounded-xl shadow-md mb-6">
              <h2 className="text-lg font-bold border-b border-gray-200 pb-3 mb-5">
                Capabilities
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {capabilities.map((cap, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-5"
                  >
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Capability {i + 1}
                    </p>
                    <p className="font-semibold text-sm">{cap.title}</p>
                    {cap.summary && (
                      <p className="text-gray-500 text-sm mt-1">
                        {cap.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {challenges.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold">Challenges</h2>
              {challenges.map((ch, ci) => (
                <div key={ch.id} className="bg-white p-8 rounded-xl shadow-md">
                  <h3 className="text-base font-bold border-b border-gray-200 pb-3 mb-5">
                    Challenge {ci + 1}: {ch.title}
                  </h3>

                  <div className="space-y-4">
                    {ch.summary && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Summary
                        </p>
                        <p className="text-gray-700 text-sm">{ch.summary}</p>
                      </div>
                    )}
                    {ch.scenario && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Scenario
                        </p>
                        <p className="text-gray-700 text-sm">{ch.scenario}</p>
                      </div>
                    )}
                    {ch.deliverables?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Deliverables
                        </p>
                        <ul className="space-y-1">
                          {ch.deliverables.map((d, i) => (
                            <li
                              key={i}
                              className="text-sm text-gray-700 flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF0046] inline-block" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ch.submission_requirements && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Submission Requirements
                        </p>
                        <p className="text-gray-700 text-sm">
                          {ch.submission_requirements}
                        </p>
                      </div>
                    )}
                    {ch.rubric_criteria?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Rubric
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {ch.rubric_criteria.map((cr, ri) => (
                            <div
                              key={ri}
                              className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <p className="font-semibold text-sm">
                                  {cr.title}
                                </p>
                                <span className="text-xs font-bold text-[#FF0046] ml-2 shrink-0">
                                  {cr.weight}%
                                </span>
                              </div>
                              <p className="text-gray-500 text-xs">
                                {cr.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
