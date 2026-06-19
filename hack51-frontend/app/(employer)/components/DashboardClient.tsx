"use client";

import Link from "next/link";
import ChallengeButton from "./ChallengeButton";
import { useEffect, useState } from "react";
import { EmployerDashboardProps } from "@/types/dashboard";
import { toast } from "react-toastify";
import { FileBadge, PenSquareIcon, Users, CheckCircle } from "lucide-react";
import { badgeClasses } from "@/lib/globalFunction";
import { useRouter } from "next/navigation";
import { dashboardService } from "@/lib/services/dashboard.service";

interface DashboardProps {
  title: string;
  description: string;
}

export default function DashboardClient({
  title,
  description,
}: DashboardProps) {
  const headers = ["Request Title", "Deadline", "Status", "Actions"];
  const [dashboardData, setDashboardData] =
    useState<EmployerDashboardProps | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getEmployerDashboardData();
        setDashboardData(data);
      } catch (error: any) {
        toast.error("Error fetching dashboard data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const daysLeft = (deadline: string) => {
    if (!deadline) return "—";
    const diff = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return "Expired";
    return `${diff}d`;
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <section className="flex justify-between">
            <div>
              <h1 className="text-3xl font-bold">{title}</h1>
              <p className="text-gray-600 mt-2">{description}</p>
            </div>

            <div>
              <ChallengeButton />
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="card bg-white p-8 rounded-lg shadow border-t-3 border-[#FF0046]">
              <FileBadge className="w-6 h-6 text-[#FF0046] mb-2" />
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Total Requests</h3>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold text-green-500 bg-green-100`}
                >
                  CURRENT
                </div>
              </div>

              <p className="text-2xl font-bold mt-2">
                {dashboardData?.summary.total_requests}
              </p>
              <p className={`text-sm text-green-500`}>Steady Progress</p>
            </div>

            <div className="card bg-white p-8 rounded-lg shadow border-t-3 border-[#FF0046]">
              <Users className="w-6 h-6 text-[#FF0046] mb-2" />
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Submissions Received</h3>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold text-green-500 bg-green-100`}
                >
                  GROWTH
                </div>
              </div>

              <p className="text-2xl font-bold mt-2">
                {dashboardData?.summary.total_submissions}
              </p>
              <p className={`text-sm text-green-500`}>Request Submissions</p>
            </div>

            <div className="card bg-white p-8 rounded-lg shadow border-t-3 border-[#FF0046]">
              <PenSquareIcon className="w-6 h-6 text-[#FF0046] mb-2" />
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pending Evaluation</h3>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold text-yellow-600 bg-yellow-100`}
                >
                  ACTION NEEDED
                </div>
              </div>

              <p className="text-2xl font-bold mt-2">
                {dashboardData?.summary.total_evaluations}
              </p>
              <p className={`text-sm text-yellow-600`}>Pending Evaluation</p>
            </div>

            <div className="card bg-white p-8 rounded-lg shadow border-t-3 border-[#FF0046]">
              <CheckCircle className="w-6 h-6 text-[#FF0046] mb-2" />
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  Shortlisted Candidates
                </h3>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold text-green-500 bg-green-100`}
                >
                  SUCCESS
                </div>
              </div>

              <p className="text-2xl font-bold mt-2">
                {dashboardData?.summary.total_shortlists_delivered}
              </p>
              <p className={`text-sm text-green-500`}>
                Completed Hiring Cycles
              </p>
            </div>
          </section>

          <section className="bg-white p-4 shadow mt-8 rounded-2xl">
            <div className="flex justify-between items-center my-4 mb-6">
              <h2 className="text-xl font-bold">Active Requests</h2>
              <div className="flex items-center">
                <input
                  type="text"
                  placeholder="Search requests..."
                  className="border border-gray-100 p-2 rounded-lg shadow w-full mx-6"
                />
                <Link
                  href="/requests"
                  className="bg-[#FF0046] hover:bg-red-700 text-white font-bold py-2 px-6 whitespace-nowrap rounded"
                >
                  View All
                </Link>
              </div>
            </div>

            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-50">
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="py-2 px-4 border-b border-gray-100 text-left text-sm font-semibold text-gray-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dashboardData?.active_requests.slice(0, 3).map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <span className="font-semibold text-sm">{req.title}</span>

                      <p className="text-xs text-gray-400 mt-0.5">
                        ID: {req.id.slice(0, 8)}…
                      </p>
                    </td>

                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span>
                        {req.deadline
                          ? new Date(req.deadline).toLocaleDateString()
                          : "—"}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">
                        ({daysLeft(req.deadline)})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold capitalize ${badgeClasses(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <button
                        onClick={() => router.push(`/requests/${req.id}`)}
                        className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
                {!dashboardData?.active_requests.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-gray-500">
                      No active requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="bg-white p-8 shadow mt-8 rounded-2xl">
            <h2 className="text-xl font-bold">Challenge Insights</h2>
            <p className="text-gray-600 mt-2">
              Your challenges are performing better than 78% of other companies
              in the Technology sector. Candidates appreciate the clarity of the
              Senior Product Designer challenge.
            </p>
            <div className="flex my-6 gap-6">
              <div className="shadow rounded-lg p-4 border border-gray-200">
                <h3 className="text-md font-semibold">Completion Rate</h3>
                <p className="text-2xl font-bold text-green-500">95%</p>
              </div>
              <div className="shadow rounded-lg p-4 border border-gray-200">
                <h3 className="text-md font-semibold">Average Score</h3>
                <p className="text-2xl font-bold text-green-500">7.8/10</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
