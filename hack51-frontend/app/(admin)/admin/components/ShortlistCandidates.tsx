"use client";

import { useEffect, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { SubmissionFullDetail } from "@/types/submissions";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { reviewService } from "@/lib/services/review.service";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/globalFunction";
import { ConfirmProps } from "@/types/submissions";

const ITEMS_PER_PAGE = 10;

export default function ShortlistCandidates() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [allCandidates, setAllCandidates] = useState<SubmissionFullDetail[]>(
    [],
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const searchParams = useSearchParams();
  const shortlistSize = Number(searchParams.get("shortlist_size")) || 0;

  const totalPages = Math.max(
    1,
    Math.ceil(allCandidates.length / ITEMS_PER_PAGE),
  );
  const paginated = allCandidates.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );
  const router = useRouter();

  const params = useParams();
  const id = params.requestId as string;

  const toggle = (candidateId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else if (next.size >= shortlistSize) {
        toast.warning(
          `You can only select ${shortlistSize} candidate${shortlistSize !== 1 ? "s" : ""}`,
        );
        return prev;
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  useEffect(() => {
    const fetchShortlistedCandidates = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getShortListedCandidates(id, {});
        setAllCandidates(response.data);
        toast.success("Candidates loaded successfully");
      } catch (err: any) {
        toast.error("Failed to load candidates");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchShortlistedCandidates();
  }, [id]);

  const handleConfirm = async () => {
    try {
      setConfirming(true);

      const selectedCandidates = allCandidates.filter((candidate) =>
        selected.has(candidate.users.id),
      );

      const confirmData = selectedCandidates.map((candidate, index) => ({
        candidate_id: candidate.users.id,
        submission_id: candidate.id,
        rank: index + 1,
      }));

      await reviewService.confirmTopNCandidates(id, {
        selections: confirmData,
      });
      setConfirmed(true);
      toast.success("Candidates confirmed. You can now deliver the shortlist.");
    } catch (err: any) {
      toast.error("Failed to confirm candidates. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDeliver = async () => {
    try {
      setDelivering(true);
      await reviewService.deliverFinalShortlist(id, Array.from(selected));
      setShowSuccess(true);
    } catch (err: any) {
      toast.error("Failed to deliver shortlist. Please try again.");
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div>
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 flex flex-col items-center text-center">
            <button
              onClick={() => setShowSuccess(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-4">
              <CheckCircle size={36} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-1">Shortlist Delivered!</h2>
            <p className="text-sm text-gray-400 mb-6">
              Your top {shortlistSize} candidates have been successfully
              delivered.
            </p>
            <button
              onClick={() => router.push("/admin/shortlists")}
              className="w-full py-3 bg-[#F01E5A] hover:bg-[#c0144a] text-white text-sm font-bold rounded-lg transition-colors"
            >
              View Top N
            </button>
          </div>
        </div>
      )}

      {/* Back */}
      <button
        onClick={() => router.push("/admin/review")}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#F01E5A] transition-colors mb-4"
      >
        <ChevronLeft size={16} />
        Back to review
      </button>

      <h1 className="text-2xl font-bold">Shortlisted Candidates</h1>
      <p className="text-sm text-gray-400 mt-0.5 mb-6">
        Select Top-N from shortlisted candidates
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="loader" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <p className="text-lg font-bold">
                Select {shortlistSize} candidate{shortlistSize !== 1 ? "s" : ""}{" "}
                <span className="text-[#F01E5A]">
                  ({selected.size}/{shortlistSize})
                </span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleConfirm}
                  disabled={
                    selected.size !== shortlistSize || confirmed || confirming
                  }
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#F01E5A] text-[#F01E5A] hover:bg-red-50 disabled:opacity-40 disabled:cursor-default text-sm font-bold rounded-lg transition-colors"
                >
                  {confirming && (
                    <div className="loader" style={{ width: "16px" }} />
                  )}
                  {confirming
                    ? "Confirming..."
                    : confirmed
                      ? "Confirmed"
                      : "Confirm selection"}
                </button>
                <button
                  onClick={handleDeliver}
                  disabled={!confirmed || delivering}
                  className="flex items-center gap-2 px-6 py-3 bg-[#F01E5A] hover:bg-[#c0144a] disabled:opacity-40 disabled:cursor-default text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {delivering && (
                    <div className="loader" style={{ width: "16px" }} />
                  )}
                  {delivering ? "Delivering..." : "Deliver Final shortlists"}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="px-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="w-10 pb-3 pt-4" />
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pt-4 pr-4">
                  Submission ID
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pt-4 pr-4">
                  Candidate name
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pt-4 pr-4">
                  Date evaluated
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pt-4">
                  Score/100
                </th>
              </tr>
            </thead>
            <tbody>
              {allCandidates.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No candidates found
                  </td>
                </tr>
              ) : null}
              {paginated.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => toggle(row.id)}
                  >
                    <td className="py-4 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(row.users.id)}
                        onChange={() => toggle(row.users.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded accent-[#F01E5A] cursor-pointer"
                      />
                    </td>
                    <td className="py-4 pr-4 text-xs font-mono text-gray-600">
                      {/* <h1>{row.}</h1> */}
                      {row.id}
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {row.users.first_name} {row.users.last_name}
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-500">
                      {row.scored_at ? formatDate(row.scored_at) : "-"}
                    </td>
                    <td className="py-4 text-sm font-bold text-[#F01E5A] font-mono">
                      {row.total_score}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1.5 text-sm font-semibold disabled:text-gray-300 hover:text-[#F01E5A] transition-colors disabled:cursor-default"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from(
                { length: Math.min(3, totalPages) },
                (_, i) => i + 1,
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${
                    page === n
                      ? "bg-[#F01E5A] text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 3 && (
                <span className="text-sm text-gray-400">4...{totalPages}</span>
              )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1.5 text-sm font-semibold disabled:text-gray-300 hover:text-[#F01E5A] transition-colors disabled:cursor-default"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </>
      )}
      </div>
    </div>
  );
}
