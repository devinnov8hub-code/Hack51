"use client";

import { useEffect, useState } from "react";
import { useRequestStore } from "@/lib/context/useRequestStore";
import { employerService } from "@/lib/services/employer.service";

type RubricCriterion = { title: string; description: string; weight: number };

export default function RubricEditor() {
  const { challenge } = useRequestStore();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challenge?.id) return;
    setLoading(true);
    employerService.getChallengeById(challenge.id)
      .then((c: any) => {
        const data = c?.data ?? c;
        setChallengeTitle(data?.title ?? "");
        setCriteria(data?.rubric_criteria ?? []);
      })
      .catch((err: any) => console.error("Error fetching rubric", err.message))
      .finally(() => setLoading(false));
  }, [challenge?.id]);

  if (loading) return <div className="loader mx-auto my-24" />;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl pb-3">Rubric Editor</h2>
      {challengeTitle && (
        <p className="text-gray-500 text-sm mt-2">{challengeTitle}</p>
      )}

      {criteria.length === 0 ? (
        <p className="text-gray-500 text-sm mt-8">No rubric criteria found for this challenge.</p>
      ) : (
        <div className="space-y-4 mt-6">
          {criteria.map((cr, i) => (
            <section key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-sm">
                  Criteria {i + 1}: {cr.title}
                </h3>
                <span className="text-sm font-bold text-[#FF0046] bg-red-50 px-3 py-1 rounded-full">
                  {cr.weight}%
                </span>
              </div>
              <p className="text-gray-600 text-sm">{cr.description}</p>
            </section>
          ))}

          <div className="flex justify-end mt-2">
            <span className="text-sm text-gray-500">
              Total weight:{" "}
              <span className={
                criteria.reduce((s, c) => s + c.weight, 0) === 100
                  ? "text-green-600 font-semibold"
                  : "text-[#FF0046] font-semibold"
              }>
                {criteria.reduce((s, c) => s + c.weight, 0)}%
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
