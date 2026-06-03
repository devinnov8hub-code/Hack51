"use client";

import { useEffect, useState } from "react";
import { useRequestStore } from "@/lib/context/useRequestStore";
import { employerService } from "@/lib/services/employer.service";

export default function ChallengeEditor() {
  const { challenge } = useRequestStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challenge?.id) return;
    setLoading(true);
    employerService.getChallengeById(challenge.id)
      .then((res: any) => setData(res?.data ?? res))
      .catch((err: any) => console.error("Error loading challenge:", err.message))
      .finally(() => setLoading(false));
  }, [challenge?.id]);

  if (loading) return <div className="loader mx-auto my-24" />;
  if (!data) return null;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl pb-3">Challenge Editor</h2>

      <div className="mt-6">
        <h3 className="font-semibold mb-1">Title</h3>
        <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-lg">{data.title}</p>
      </div>

      {data.summary && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">Summary</h3>
          <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-lg">{data.summary}</p>
        </div>
      )}

      {data.scenario && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">Scenario</h3>
          <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-lg">{data.scenario}</p>
        </div>
      )}

      {data.deliverables?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Deliverables</h3>
          <div className="space-y-2">
            {data.deliverables.map((d: string, i: number) => (
              <div key={i} className="bg-gray-50 border border-gray-100 p-3 rounded-lg text-sm text-gray-700">
                {d}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.constraints_text && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">Tooling Requirements & Restrictions</h3>
          <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-lg text-sm">{data.constraints_text}</p>
        </div>
      )}

      {data.submission_requirements && (
        <div className="mt-6">
          <h3 className="font-semibold mb-1">Submission Requirements</h3>
          <p className="text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-lg text-sm">{data.submission_requirements}</p>
        </div>
      )}
    </div>
  );
}
