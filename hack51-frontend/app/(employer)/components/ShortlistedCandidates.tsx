"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Plus, Lock, ExternalLink } from "lucide-react";
import TalentListModal from "./LockedListModal";
import { employerService } from "@/lib/services/employer.service";
import { ShortlistedCandidatesProps } from "@/types/shortlist";
import { toast } from "react-toastify";

export default function ShortlistedCandidates() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"shortlisted" | "all">(
    "shortlisted",
  );
  const [candidate, setCandidate] = useState<ShortlistedCandidatesProps | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);
  const params = useParams();
  const id = params.id as string;

  activeTab === "shortlisted" ? candidate : [];

  useEffect(() => {
    const fetchCandidates = async (id: string) => {
      try {
        setLoading(true);
        const response = await employerService.getShortlistById(id);
        const data = response;
        setCandidate(data);
      } catch (error: any) {
        toast.error("Error fetching candidates:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates(id);
  }, [activeTab]);

  const exportCSV = async () => {
    try {
      const response = await employerService.exportShortlistCSV(id);

      // create downloadable blob
      const blob = new Blob([response], {
        type: "text/csv;charset=utf-8;",
      });

      // create temporary url
      const url = window.URL.createObjectURL(blob);

      // create hidden anchor
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute(
        "download",
        `${candidate?.title || "shortlist"}_${id}.csv`,
      );

      document.body.appendChild(link);

      // trigger download
      link.click();

      // cleanup
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("CSV downloaded successfully");
    } catch (error: any) {
      console.error("CSV DOWNLOAD ERROR", error);

      toast.error(error?.message || "Failed to download CSV");
    }
  };

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => router.push("/shortlists")}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to Shortlists
      </button>

      {/* Page header */}
      <section className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold capitalize">{`${candidate?.title} Role Shortlists`}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Review candidates from completed requests
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button className="flex items-center gap-2 bg-[#FF0046] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Rerun request
            <Plus size={16} />
          </button>
        </div>
      </section>

      {/* Candidates card */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100">
            {/* Tabs */}
            <div className="flex gap-6 px-6 pt-4 border-b border-gray-100">
              <button
                onClick={() => setActiveTab("shortlisted")}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "shortlisted"
                    ? "border-[#FF0046] text-[#FF0046]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Shortlisted({candidate?.shortlists.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("all");
                  setIsOpen(true);
                }}
                className={`pb-3 text-sm font-medium border-b-2 flex items-center gap-1 transition-colors ${
                  activeTab === "all"
                    ? "border-[#FF0046] text-[#FF0046]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Lock size={13} />
                All scored candidates({candidate?.shortlists.length})
              </button>
            </div>

            {/* Candidate rows */}
            <div>
              {!loading && candidate?.shortlists.length === 0 && (
                <div className="flex justify-center py-24">
                  <p className="text-gray-500">No candidates found.</p>
                </div>
              )}
              {candidate?.shortlists.map((shortlist, index) => (
                <div
                  key={shortlist.id}
                  className={`grid grid-cols-[2fr_1fr_2fr_2fr] gap-6 px-6 py-6 ${
                    index !== candidate.shortlists.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  {/* Name + View Artifacts */}
                  <div className="flex flex-col justify-center gap-4">
                    <span className="text-2xl font-bold capitalize">
                      {shortlist.users.first_name} {shortlist.users.last_name}
                    </span>

                    <button className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 w-fit">
                      View Artifacts
                      <ExternalLink size={14} />
                    </button>
                  </div>

                  {/* Total Request Score */}
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-gray-500 mb-2">
                      Total Request score
                    </span>

                    <span className="text-4xl font-bold text-[#FF0046]">
                      {shortlist.submissions.total_score}

                      <span className="text-lg font-normal text-gray-400">
                        /100
                      </span>
                    </span>
                  </div>

                  {/* Criterion Breakdown */}
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-gray-500 mb-3">
                      Criterion Breakdown
                    </span>

                    <div className="flex flex-col gap-1">
                      {shortlist.submissions.submission_scores.map(
                        (criterion, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-700">
                              {criterion.criterion_title} ({criterion.weight}%)
                            </span>

                            <span className="text-[#FF0046] font-medium ml-4">
                              {criterion.score_percent}%
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Expert Review Notes */}
                  <div className="flex flex-col justify-center">
                    <span className="text-xs text-gray-500 mb-2">
                      Expert Review Notes
                    </span>

                    <textarea
                      readOnly
                      value={shortlist.submissions.reviewer_notes}
                      rows={4}
                      className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600 resize-none bg-white w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <TalentListModal
        isOpen={isOpen}
        onClose={onClose}
        // buttonText={buttonText}
      />
    </div>
  );
}
