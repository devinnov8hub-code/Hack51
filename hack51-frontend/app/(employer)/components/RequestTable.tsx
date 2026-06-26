"use client";

import { EmployerRequest } from "@/types/employer";
import { employerService } from "@/lib/services/employer.service";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RequestTableProps {
  requests: EmployerRequest[];
  detailed?: boolean;
  onRequestUpdated?: (id: string, updatedRequest: Partial<EmployerRequest>) => void;
}

const badgeClasses = (status: string) => {
  const key = (status ?? "").toLowerCase();
  if (key === "published") return "bg-blue-100 text-blue-800";
  if (key === "evaluating") return "bg-yellow-100 text-yellow-800";
  if (key === "shortlisted") return "bg-green-100 text-green-800";
  if (key === "draft") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
};

const daysLeft = (deadline: string) => {
  if (!deadline) return "—";
  const diff = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return "Expired";
  return `${diff}d`;
};

export default function RequestTable({
  requests,
  detailed = false,
  onRequestUpdated,
}: RequestTableProps) {
  const headers = [
    "Request Title",
    "Role Level",
    "Deadline",
    "Status",
    "Actions",
  ];
  const router = useRouter();
  const [publishing, setPublishing] = useState<string | null>(null);

  const handlePublish = async (request_id: string, challenge_id: string) => {
    setPublishing(request_id);
    try {
      // publishRequest now returns { request, payment }.
      // While payment is skipped (dev mode / SKIP_PAYMENT=true), we only
      // need the request to update the UI. When Paystack is enabled later,
      // branch on payment.skip and redirect to payment.authorization_url.
      const { request: updatedRequest /*, payment */ } =
        await employerService.publishRequest(request_id, challenge_id);

      onRequestUpdated?.(request_id, updatedRequest);
    } catch (err: any) {
      console.error("Failed to publish request:", err.message);
      alert(err.message ?? "Failed to publish request.");
    } finally {
      setPublishing(null);
    }
  };

  if (requests.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No requests found.</p>;
  }

  return (
    <div className="overflow-x-auto">
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
          {requests.map((req) => (
            <tr
              key={req.id}
              className="border-b border-gray-100 hover:bg-gray-50"
            >
              <td className="py-3 px-4">
                <span className="font-semibold text-sm">{req.title}</span>
                {detailed && req.id && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    ID: {req.id.slice(0, 8)}…
                  </p>
                )}
              </td>
              <td className="py-3 px-4 text-sm capitalize text-gray-600">
                {req.role_level?.replace(/-/g, " ") || "—"}
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
                {req.status === "draft" && (
                  <button
                    onClick={() => handlePublish(req.id!, req.challenges.id)}
                    disabled={publishing === req.id}
                    className="text-sm text-white bg-[#FF0046] hover:bg-red-700 disabled:opacity-60 px-3 py-1 rounded"
                  >
                    {publishing === req.id ? "Publishing..." : "Publish"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}