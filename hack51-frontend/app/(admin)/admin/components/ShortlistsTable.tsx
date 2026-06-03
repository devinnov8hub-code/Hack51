"use client";

import { useEffect, useState } from "react";
import {
  Search,
  ChevronDown,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { reviewService } from "@/lib/services/review.service";
import { useRouter, useSearchParams } from "next/navigation";
import { SubmissionFullDetail } from "@/types/submissions";
import { toast } from "react-toastify";
import { ShortlistProps } from "@/types/shortlist";
import { badgeClasses } from "@/lib/globalFunction";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "in_review") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-600 border border-yellow-200">
        In review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      Delivered
    </span>
  );
};

const ITEMS_PER_PAGE = 10;

export default function ShortlistsTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [shortLists, setShortlists] = useState<ShortlistProps[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "all" ? "all" : "top-n shortlists";

  useEffect(() => {
    const fetchShortlists = async () => {
      try {
        setLoading(true);
        const response = await reviewService.getShortlists({});
        setShortlists(response.data);
      } catch (err: any) {
        toast.error("Failed to load shortlists");
      } finally {
        setLoading(false);
      }
    };
    fetchShortlists();
  }, []);

  const filtered = shortLists.filter(
    (row) =>
      row.title.toLowerCase().includes(search.toLowerCase()) ||
      row.id.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">Shortlists</h1>
      <p className="text-sm text-gray-400 mt-0.5 mb-6">
        List of shortlisted candidates
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b-2 border-gray-200 px-6 pt-4">
          <button
            onClick={() => router.push("/admin/shortlists")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${
              activeTab === "top-n shortlists"
                ? "text-[#F01E5A] border-[#F01E5A]"
                : "text-gray-400 border-transparent hover:text-gray-700"
            }`}
          >
           Top-N Shortlists
          </button>
          <button
            onClick={() => router.push("/admin/shortlists?tab=all")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-0.5 transition-colors ${
              activeTab === "all"
                ? "text-[#F01E5A] border-[#F01E5A]"
                : "text-gray-400 border-transparent hover:text-gray-700"
            }`}
          >
            All Candidates
          </button>
        </div>

        <div className="p-6">
          {/* Search + Filter */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 flex items-center gap-2.5 bg-white border border-gray-200 rounded-3xl px-4 py-2.5">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search by id, name.."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="text-sm flex-1 outline-none bg-transparent placeholder:text-gray-400"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
              Filter
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                  Request Title
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                  Role Level
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                  Shortlist Size(n)
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">
                  Status
                </th>
                {/* <th className="text-left text-xs font-semibold text-gray-400 pb-3">
                  Action
                </th> */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="loader mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-12 text-center text-sm text-gray-400"
                  >
                    No shortlists found
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-4 pr-4">
                      <p className="text-sm font-semibold capitalize">
                        {row?.title}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        ID: {row.id}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-base font-semibold capitalize">
                      {row?.role_level}
                    </td>
                    <td className="py-4 pr-4 text-base font-semibold">
                      {row?.shortlist_size}
                    </td>
                    <td className="py-4 pr-4 ">
                      {/* {`${badgeClasses(row.status)}`} */}
                      <StatusBadge status={row.status} />
                    </td>
                    {/* <td className="py-4">
                      <button
                        onClick={() =>
                          router.push(`/admin/shortlists/${row?.id ?? row.id}`)
                        }
                        className="flex items-center gap-2 text-sm font-bold hover:text-[#F01E5A] transition-colors"
                      >
                        View
                        <Eye size={15} />
                      </button>
                    </td> */}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
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
      </div>
    </div>
  );
}
