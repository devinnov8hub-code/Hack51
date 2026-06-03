"use client";
import { FileSpreadsheet } from "lucide-react";
import Image from "next/image";
import EvaluationBarChart from "./EvaluationBarChart";
import RequestPieChart from "./RequestPieChart";
import CustomActiveShapePieChart from "./RequestPieChart";
import { AdminDashboardProps } from "@/types/dashboard";
import { useEffect } from "react";
import { useState } from "react";
import { dashboardService } from "@/lib/services/dashboard.service";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function DashboardClient() {
  const headers = ["Request Title", "Deadline", "Status", "Actions"];
  const [dashboardData, setDashboardData] =
    useState<AdminDashboardProps | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getAdminDashboardData();
        setDashboardData(data);
      
      } catch (error: any) {
        toast.error("Error fetching dashboard data ");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const metrics = [
    {
      name: "Total Users",
      value: dashboardData?.users.total,
      icon: FileSpreadsheet,
      info: "2 more than last month",
    },

    {
      name: "Submissions Received",
      value: dashboardData?.stats.submissions_received,
      icon: FileSpreadsheet,
      info: "12% more than last month",
    },

    {
      name: "Evaluated Submissions",
      value: dashboardData?.stats.evaluated_submissions,
      icon: FileSpreadsheet,
      info: "Pending review",
    },
    {
      name: "Shortlisted Candidates",
      value: dashboardData?.stats.shortlists_delivered,
      icon: FileSpreadsheet,
      info: "Completed Hiring Cycles",
    },
  ];

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
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <div
                className="card bg-white p-6 rounded-lg shadow border-t-4 border-[#FF0046]"
                key={index}
              >
                <metric.icon className="text-[#FF0046] mb-3" />
                <h3 className="text-gray-600 text-sm font-medium mb-2">
                  {metric.name}
                </h3>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-xs text-green-400">{metric.info}</p>
              </div>
            ))}
          </section>

          <section className="flex justify-between items-center">
            <div className="shadow bg-white rounded-lg p-3 w-1/2 mr-10 ">
              <div className="flex gap-2 border-b my-2 border-b-gray-200">
                <FileSpreadsheet className="text-[#FF0046]" />
                <h1 className="font-bold">Reviewers evaluation per day </h1>
              </div>
              <EvaluationBarChart />
            </div>
            <div className="shadow bg-white rounded-lg p-3 w-1/2 ml-10 ">
              <div className="flex gap-2 border-b my-2 border-b-gray-200">
                <FileSpreadsheet className="text-[#FF0046]" />
                <h1 className="font-bold">Reviewers evaluation per day </h1>
              </div>
              <EvaluationBarChart />
              {/* <CustomActiveShapePieChart /> */}
            </div>
          </section>

          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <h2 className="text-xl font-bold mb-4">Recent Requests</h2>
         
        {/* {loading ? (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        ) : dashboardData?.requests?.data === 0 ? (
          <p className="text-gray-500 text-sm py-4">No recent requests.</p>
        ) : (
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
              {dashboardData?.requests?.slice(0, 3).map((req) => (
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
            </tbody>
          </table>
        )}  */}
          </div>
        </>
      )}
    </div>
  );
}
