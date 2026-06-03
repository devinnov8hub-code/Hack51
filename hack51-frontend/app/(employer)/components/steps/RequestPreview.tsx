"use client";

import { useRequestStore } from "@/lib/context/useRequestStore";

export default function RequestPreview() {
  const {
    role,
    role_level,
    challenge,
    challenge_cap,
    shortlist_size,
    deadline,
    setChallengeCap,
    setShortlistSize,
    setDeadline,
  } = useRequestStore();

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl font-bold">
        Request Preview
      </h2>
      <div className="flex items-center">
        <label className="block mt-4 mb-2 font-semibold">Role Title</label>
        <span className="block mt-4 mb-2 px-4">{role?.name ?? "—"}</span>
      </div>
      <div className="flex items-center">
        <label className="block mt-4 mb-2 font-semibold">Role Level</label>
        <span className="block mt-4 mb-2 px-4 capitalize">{role_level?.level ?? "—"}</span>
      </div>
      <div className="flex items-center">
        <label className="block mt-4 mb-2 font-semibold">Challenge</label>
        <span className="block mt-4 mb-2 px-4">{challenge?.title ?? "—"}</span>
      </div>

      <section className="bg-white rounded-xl mt-12">
        <h2 className="border-b border-b-gray-300 text-xl font-bold">
          Request Settings
        </h2>
        <div className="mt-6 flex space-x-4">
          <div>
            <label htmlFor="submissionCap" className="text-sm font-medium text-gray-700">
              Submission cap (required)
            </label>
            <input
              type="number"
              id="submissionCap"
              placeholder="Maximum submissions from candidates"
              value={challenge_cap}
              onChange={(e) => setChallengeCap(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 w-full mt-2 bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="shortlistSize" className="text-sm font-medium text-gray-700">
              Shortlist size (20 max)
            </label>
            <input
              type="number"
              id="shortlistSize"
              placeholder="Total candidates to shortlist"
              value={shortlist_size}
              onChange={(e) => setShortlistSize(Number(e.target.value))}
              className="border border-gray-300 rounded-lg p-2 w-full mt-2 bg-gray-50"
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="challengeDeadline" className="text-sm font-medium text-gray-700">
            Challenge deadline
          </label>
          <input
            type="date"
            id="challengeDeadline"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="border border-gray-300 rounded-lg p-2 w-full mt-2 bg-gray-50"
          />
        </div>
      </section>
    </div>
  );
}
