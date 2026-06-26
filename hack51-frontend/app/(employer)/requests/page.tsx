"use client";

import RequestTable from "../components/RequestTable";
import ChallengeButton from "../components/ChallengeButton";
import { employerService } from "@/lib/services/employer.service";
import { useEffect, useState } from "react";
import { EmployerRequest } from "@/types/employer";

type Tab = "all" | "drafts" | "closed";

export default function RequestsPage() {
  const [requests, setRequests] = useState<EmployerRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await employerService.getRequests({ page: 1, limit: 50 });

        setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching requests", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleRequestUpdated = (
    id: string,
    updatedRequest: Partial<EmployerRequest>,
  ) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updatedRequest } : r)),
    );
  };

  const filtered = requests.filter((r) => {
    if (activeTab === "drafts") return r.status === "draft";
    if (activeTab === "closed")
      return r.status === "shortlisted" || r.status === "evaluating";
    return true;
  });

  return (
    <div>
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">All Requests</h1>
          <p className="text-gray-600 mt-2">
            Manage the lifecycle of your hiring challenges across all statuses.
          </p>
        </div>
        <ChallengeButton />
      </section>

      {/* Tabs */}
      <section className="mt-6 border-b border-gray-200">
        <div className="flex gap-1">
          {(["all", "drafts", "closed"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[#FF0046] text-[#FF0046]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab === "all" ? "All Requests" : tab}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
        <input
          type="text"
          placeholder="Search requests by title or ID..."
          className="border border-gray-100 p-2 rounded-lg shadow w-full md:w-1/2"
        />
        <div className="flex gap-2">
          <button className="border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 text-sm">
            Filter Status
          </button>
          <button className="border border-gray-200 px-4 py-2 rounded hover:bg-gray-50 text-sm">
            Sort
          </button>
        </div>
      </div>

      <section className="mt-6 shadow bg-white p-6 rounded-2xl">
        {loading && (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        )}{" "}
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">
            No requests found.
          </p>
        ) : (
          <RequestTable
            requests={filtered}
            detailed
            onRequestUpdated={handleRequestUpdated}
          />
        )}
      </section>
    </div>
  );
}
