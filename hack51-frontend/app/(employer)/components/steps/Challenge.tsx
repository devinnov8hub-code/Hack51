"use client";

import { useEffect, useState } from "react";
import { employerService } from "@/lib/services/employer.service";
import { useRequestStore } from "@/lib/context/useRequestStore";
import ChallengeCard from "../ChallengeCard";

export default function Challenge() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { role, challenge, setChallenge, nextStep } = useRequestStore();

  useEffect(() => {
    if (!role?.id) return;
    setLoading(true);
    employerService
      .getChallenges()
      .then((all: any[]) => {
        const filtered = all.filter(
          (c) =>
            c.catalog_roles?.id === role.id || c.catalog_role_id === role.id,
        );
        setChallenges(filtered);
        // clear stale challenge if it doesn't belong to this role's filtered list
        if (challenge && !filtered.some((c) => c.id === challenge.id)) {
          setChallenge(null);
        }
      })
      .catch((err: any) =>
        console.error("Error fetching challenges", err.message),
      )
      .finally(() => setLoading(false));
  }, [role?.id]);

  const handleSelect = (id: string) => {
    const selected = challenges.find((c) => c.id === id);
    if (!selected) return;
    setChallenge({ id: selected.id, title: selected.title });
    nextStep();
  };

  if (loading) return <div className="loader mx-auto my-24" />;

  return (
    <div className=" bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h1 className="text-2xl font-bold">Challenge Details</h1>
      <p className="text-gray-500 text-sm mt-1">
        Select the challenge for this role
      </p>

      {challenges.length === 0 ? (
        <p className="text-gray-500 text-sm mt-8">
          No challenges found for this role.
        </p>
      ) : (
        <section className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <ChallengeCard
              key={c.id}
              id={c.id}
              title={c.title}
              description={c.summary ?? c.description}
              isSelected={challenge?.id === c.id}
              onSelect={handleSelect}
            />
          ))}
        </section>
      )}
    </div>
  );
}
