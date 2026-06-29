"use client";

import { ArrowLeft, ArrowRight, Eye, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmissionFullDetail, SubmissionListProps } from "@/types/submissions";
import { EmployerRequest } from "@/types/employer";
import { formatDate } from "@/lib/globalFunction";
import { useState } from "react";
import { SubmissionStatus } from "@/types/submissions";
import { reviewService } from "@/lib/services/review.service";
import { toast } from "react-toastify";
import { badgeClasses } from "@/lib/globalFunction";

interface SubmissionsTableProps {
  submissions: SubmissionListProps[];
  requestId: string;
  detailed?: boolean;
}

export default function SubmissionsList({
  submissions,
  requestId,
  detailed = false,
}: SubmissionsTableProps) {
  const headers = [
    "Candidate name",
    "Candidate Email",
    "Date",
    "Status",
    "Action",
  ];

  const router = useRouter();
  const [request, setRequests] = useState<EmployerRequest | null>(null);
  const [triageSubmission, setTriageSubmission] =
    useState<SubmissionFullDetail | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);

  const handleTriageSubmission = async (id: string) => {
    setEvaluatingId(id);
    try {
      const response = await reviewService.triageSubmission(id, {
        decision: "valid",
        reason: "All deliverables present",
      });
      setTriageSubmission(response.data);

      toast("Success!, Request under review");
      setTimeout(() => {
        router.push(`/admin/review/${requestId}/submissions/${id}`);
      }, 3000);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to begin evaluation, something went wrong");
    } finally {
      setEvaluatingId(null);
    }
  };
  return (
    <div className="overflow-x-auto shadow rounded-lg p-8 bg-white">
      {triageSubmission && (
        <section className="flex gap-10 bg-white border-b pb-4 border-b-gray-200">
          <div className="flex items-center gap-4">
            <UserCircle2 className="text-[#FF0046]" />
            {/* company credentials */}
            <div>
              {/* <h1 className="font-bold">Magrib Constructions</h1>
              <p className="text-sm text-gray-500">magrib@gmail.com</p> */}
            </div>
          </div>
          <div>
            <h1 className="font-bold">{triageSubmission.job_requests.title}</h1>           
            <p className="text-sm text-gray-500">{requestId}</p>
          </div>
        </section>
      )}
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
          {submissions.map((sub, idx) => (
            <tr className="border-b border-gray-100" key={idx}>
              <td className="py-2 px-4">
                <div className="flex flex-col">
                  <span className="font-semibold capitalize">
                    {sub.users.first_name} {sub.users.last_name}
                  </span>
                  {detailed && (
                    <>
                      {sub.id && (
                        <small className="text-gray-500">ID: {sub.id}</small>
                      )}
                    </>
                  )}
                </div>
              </td>

              <td className="py-2 px-4">{sub.users.email}</td>

              <td className="py-2 px-4">
                {formatDate(sub.submitted_at ?? "-")}
              </td>
              <td className="py-2 px-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${badgeClasses(sub.status)}`}
                >
                  {sub.status}
                </span>
              </td>
            
              <td className="py-2 px-4 flex gap-2">
                {sub.status === "submitted" ? (
                  <button
                    onClick={() => handleTriageSubmission(sub.id)}
                    className="flex gap-2 text-gray-500 hover:text-gray-700 mr-2 border border-gray-200 px-3 py-1 rounded"
                  >
                    {evaluatingId === sub.id && (
                      <div className="loader" style={{ width: "12px" }} />
                    )}
                    {evaluatingId === sub.id
                      ? "Begin evaluation..." : "Evaluate"}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      router.push(
                        `/admin/review/${requestId}/submissions/${sub.id}`,
                      )
                    }
                    className="text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded"
                  >
                    View
                  </button>
                )}
              </td>
            </tr>
          ))}
          {submissions.length === 0 && (
            <tr>
              <td
                colSpan={headers.length}
                className="py-10 px-4 text-center text-gray-500"
              >
                No submissions to the request yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <section className="flex justify-between items-center mt-8">
        <div className="flex items-center m-2 text-gray-500 text-sm">
          <ArrowLeft width={18} />
          <h5>Prev</h5>
        </div>
        <div className=" text-gray-500 text-sm">
          {submissions.map((_, idx) => idx + 1)}
        </div>
        <div className="flex items-center m-2 text-[#FF0046] text-sm">
          <h5>Next</h5>
          <ArrowRight />
        </div>
      </section>
    </div>
  );
}
