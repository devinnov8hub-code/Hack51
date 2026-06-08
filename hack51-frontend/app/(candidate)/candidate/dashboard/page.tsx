"use client";
import Link from "next/link";
import { Lock, RefreshCw, NotepadText, Check, X, Bell, FileQuestion } from "lucide-react";
import SubmissionTable from "../component.tsx/SubmissionTable";
import { dashboardService } from "@/lib/services/dashboard.service";
import { toast } from "react-toastify/unstyled";
import { useEffect, useState } from "react";
import { CandidateDashboardProps } from "@/types/dashboard";

export default function CandidateDashboardPage() {
  const headers = ["Request Title", "Deadline", "Status", "Actions"];
  const [dashboardData, setDashboardData] =
    useState<CandidateDashboardProps | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const data = await dashboardService.getCandidateDashboardData();
        setDashboardData(data);
        toast.success("Dashboard data loaded successfully");
      } catch (error: any) {
        toast.error("Error fetching dashboard data: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      label: "Active Submissions",
      value: dashboardData?.summary.total_submissions,
      sub: "Currently reviewing",
      icon: <NotepadText />,
      border: "border-[#FF1F5A]",
    },
    {
      label: "Scored Challenges",
      value: dashboardData?.summary.by_status.scored,
      sub: "",
      icon: <Check />,
      border: "border-[#FF1F5A]",
    },
    {
      label: "Submissions Under Review",
      value: dashboardData?.summary.by_status.under_review,
      sub: "Challenge under evaluation",
      icon: <FileQuestion />,
      border: "border-[#FF1F5A]",
    },
    {
      label: "Shortlisted Challenges",
      value: dashboardData?.summary.total_shortlisted,
      sub: "in the last 30 days",
      icon: <Bell />,
      border: "border-[#FF1F5A]",
    },
  ];

  function StatusBadge({ status }: { status: string }) {
    if (status === "rejected") {
      return (
        <span className="px-3 py-1 rounded-full border border-[#FF1F5A] text-[#FF1F5A] text-xs font-medium">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full border border-blue-300 text-blue-500 text-xs font-medium">
        Pending evaluation
      </span>
    );
  }

  function ActionCell({ status }: { status: string }) {
    if (status === "rejected") {
      return (
        <span className="font-semibold text-gray-800 text-sm cursor-pointer hover:text-[#FF1F5A] transition-colors flex items-center gap-1">
          <RefreshCw size={13} /> View
        </span>
      );
    }
    return (
      <span className="text-gray-400 text-sm flex items-center gap-1">
        <Lock size={13} /> Locked
      </span>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your active applications and historical performance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-xl border-t-4 ${s.border} p-5 shadow-sm`}
          >
            <div className="text-xl mb-2 text-[#FF1F5A]">{s.icon}</div>
            <p className="text-sm text-gray-600 mb-1">{s.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-gray-900">
                {s.value}
              </span>
              {s.sub && <span className="text-xs text-gray-400">{s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Active Submissions
          </h2>
          <Link
            href="/candidate/submissions"
            className="text-sm text-gray-600 hover:text-[#FF1F5A] font-medium flex items-center gap-1"
          >
            View all ▾
          </Link>
        </div>

        <SubmissionTable />
      </div>
    </>
  );
}
