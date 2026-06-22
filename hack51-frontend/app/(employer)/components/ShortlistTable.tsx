"use client";

import { employerService } from "@/lib/services/employer.service";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShortlistedCandidatesProps } from "@/types/shortlist";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formatDate } from "@/lib/globalFunction";

export default function ShortlistTable() {
  const router = useRouter();
  const headers = [
    "Request Title",
    "Role level",
    "Shortlist size(n)",
    "Date Delivered",
    "Actions",
  ];

  const [shortlists, setShortlists] = useState<ShortlistedCandidatesProps[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      setLoading(true);
      const fetchShortlistedCandidates = async () => {
        const response = await employerService.getShortlists();
        setShortlists(response);
      };
      fetchShortlistedCandidates();
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center my-6 gap-4">
            <input
              type="text"
              placeholder="Search requests by title or ID..."
              className="border border-gray-100 p-2 rounded-lg shadow w-full md:w-1/2"
            />
            <div className="flex gap-2">
              <button className="border border-gray-200 px-4 py-2 rounded hover:bg-gray-50">
                Filter Status
              </button>
              <button className="border border-gray-200 px-4 py-2 rounded hover:bg-gray-50">
                Sort
              </button>
            </div>
          </div>

          <div className=" bg-white shadow rounded-2xl mt-5 px-5 py-2">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-50">
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="py-2 px-4 border-b border-gray-100 text-left"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shortlists.map((list, idx) => (
                  <tr className="border-b border-gray-100" key={idx}>
                    <td className="py-2 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold capitalize">
                          {list.title}
                        </span>

                        <>
                          {list.id && (
                            <small className="text-gray-500">
                              ID: {list.id}
                            </small>
                          )}
                        </>
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mt-1 capitalize">
                          {list.role_level}
                        </p>
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      <div className="mb-2">
                        <p className="text-sm text-gray-600 mt-1">
                          {list.shortlist_size}
                        </p>
                      </div>
                    </td>

                    <td className="py-2 px-4">
                      {formatDate(list.shortlists[0]?.delivered_at ?? "-")}
                    </td>

                    <td className="py-2 px-4 flex gap-2">
                      <button
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mr-2 border border-gray-200 px-3 py-1 rounded"
                        onClick={() => router.push(`/shortlists/${list.id}`)}
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shortlists.length === 0 && !loading && (
              <div className="flex flex-col justify-center items-center py-24">
                <p className="text-gray-500 text-sm text-center">
                  No shortlists found.
                </p>
              </div>
            )}
            <section className="flex justify-between items-center mt-8">
              <div className="flex items-center m-2 text-gray-500 text-sm">
                <ArrowLeft width={18} />
                <h5>Prev</h5>
              </div>
              {/* <div className=" text-gray-500 text-sm">
          {shortlists.map((_, idx) => idx + 1)}
        </div> */}
              <div className="flex items-center m-2 text-[#FF0046] text-sm">
                <h5>Next</h5>
                <ArrowRight />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
