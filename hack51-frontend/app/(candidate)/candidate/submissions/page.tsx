"use client";
import Link from "next/link";
import { Search, Lock, RefreshCw, Eye, ChevronDown } from "lucide-react";
import { SubmissionListProps } from "@/types/submissions";
import { useEffect, useState } from "react";
import { submissionService } from "@/lib/services/submission.service";
import SubmissionTable from "../component.tsx/SubmissionTable";
import { toast } from "react-toastify";


function StatusBadge({ status }: { status: string }) {
  if (status === "rejected") {
    return (
      <span className="px-3 py-1 rounded-full border border-[#FF1F5A] text-[#FF1F5A] text-xs font-medium">
        Rejected
      </span>
    );
  }
  if (status === "shortlisted") {
    return (
      <span className="px-3 py-1 rounded-full border border-green-400 text-green-600 text-xs font-medium">
        Shortlisted
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full border border-blue-300 text-blue-500 text-xs font-medium">
      Pending evaluation
    </span>
  );
}

function ActionCell({ status, subId }: { status: string; subId: string }) {
  if (status === "rejected") {
    return (
      <Link href="/candidate/submissions/resubmit">
        <span className="font-semibold text-gray-800 text-sm cursor-pointer hover:text-[#FF1F5A] transition-colors flex items-center gap-1">
          <RefreshCw size={13} /> Resubmit
        </span>
      </Link>
    );
  }
  if (status === "shortlisted") {
    return (
      <Link href="/candidate/submissions/shortlist">
        <span className="font-semibold text-gray-800 text-sm cursor-pointer hover:text-[#FF1F5A] transition-colors flex items-center gap-1">
          <Eye size={13} /> View
        </span>
      </Link>
    );
  }
  return (
    <span className="text-gray-400 text-sm flex items-center gap-1">
      <Lock size={13} /> Locked
    </span>
  );
}

export default function SubmissionsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your active applications and historical performance.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            Active Submissions
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by id, or name"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#FF1F5A] transition-colors w-56"
              />
            </div>
            <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 hover:border-gray-300 transition-colors">
              Filter <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <SubmissionTable />
      </div>
    </>
  );
}
