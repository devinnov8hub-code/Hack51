"use client";
import Link from "next/link";
import { Search, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { challengeService } from "@/lib/services/challenge.service";
import { EmployerRequest } from "@/types/employer";
import { useRouter } from "next/navigation";

export default function FindChallengesPage() {
  const [challenges, setChallenges] = useState<EmployerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const fetchChallenges = async () => {
        const response = await challengeService.getCandidateChallenges();
        setChallenges(response.data);
      };
      fetchChallenges();
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find challenges</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your active applications and historical performance.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Search & Filter */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search roles or keywords"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#FF1F5A] transition-colors"
            />
          </div>
          <select className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[#FF1F5A] bg-white cursor-pointer">
            <option>All Levels</option>
            <option>Junior</option>
            <option>Mid-Level</option>
            <option>Senior</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {challenges.map((c) => (
              <div
                key={c.id}
                onClick={() =>router.push(`/candidate/challenges/${c.id}`)}
                className="border border-gray-200 rounded-xl p-4 hover:border-[#FF1F5A] hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">N</span>
                    </div>
                    {/* <span className="text-xs text-gray-500">{c?.company}</span> */}
                  </div>
                  <div className="flex items-center gap-1 bg-red-50 text-[#FF1F5A] text-[10px] font-medium px-2 py-0.5 rounded-full">
                    <Clock size={10} />
                    {c.deadline} days left
                  </div>
                </div>

                <h3 className="font-bold text-gray-900 text-sm mb-1">
                  {c.title}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Level: {c.role_level}
                </p>

                <div className="flex justify-end">
                  <Link href={`/candidate/challenges/${c.id}`}>
                    <span className="text-[#FF1F5A] text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                      Details →
                    </span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
