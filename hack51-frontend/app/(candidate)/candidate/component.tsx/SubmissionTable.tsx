import { SubmissionListProps } from "@/types/submissions";
import { useEffect, useState } from "react";
import { submissionService } from "@/lib/services/submission.service";
import Link from "next/link";
import { Lock, RefreshCw, Eye } from "lucide-react";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/globalFunction";

export default function SubmissionTable() {
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
        <Link href="/candidate/submissions/challenges">
          <span className="font-semibold text-gray-800 text-sm cursor-pointer hover:text-[#FF1F5A] transition-colors flex items-center gap-1">
            <RefreshCw size={13} /> View
          </span>
        </Link>
      );
    }
    if (status === "shortlisted") {
      return (
        <Link href={`/candidate/submissions/${subId}`}>
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

  const [submissions, setSubmissions] = useState<SubmissionListProps[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const response = await submissionService.getCandidateSubmissions();
        setSubmissions(response.data);
        setLoading(false);
      } catch (err: any) {
        toast.error("Failed to fetch submissions:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-sm font-medium text-gray-500 text-left">
                  Challenge Details
                </th>
                <th className="pb-3 text-sm font-medium text-gray-500 text-left">
                  Submission Date
                </th>
                <th className="pb-3 text-sm font-medium text-gray-500 text-left">
                  Status
                </th>
                <th className="pb-3 text-sm font-medium text-gray-500 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-4">
                    <p className="font-semibold text-gray-900 text-sm">
                      {sub.job_requests.title}
                    </p>
                    <p className="text-xs text-gray-400">{sub.id}</p>
                  </td>
                  <td className="py-4 text-sm text-gray-700">
                    {sub.job_requests.deadline
                      ? formatDate(sub.job_requests.deadline)
                      : "-"}
                  </td>
                  <td className="py-4">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="py-4 text-right">
                    <ActionCell status={sub.status} subId={sub.id} />
                  </td>
                </tr>
              ))}
              {!submissions.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
            <button className="text-sm text-gray-500 flex items-center gap-1">
              ← Prev
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF1F5A] text-white font-medium">
                1
              </span>
              <span className="text-gray-500">2</span>
              <span className="text-gray-500">3</span>
              <span className="text-gray-500">4...10</span>
            </div>
            <button className="text-sm text-[#FF1F5A] flex items-center gap-1 font-medium">
              Next →
            </button>
          </div>
        </>
      )}
    </>
  );
}
