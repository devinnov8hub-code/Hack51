"use client";

import { EmployerRequest } from "@/types/employer";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { employerService } from "@/lib/services/employer.service";
import { TriangleAlert } from "lucide-react";
import { formatDate } from "@/lib/globalFunction";

type ActivityState = "done" | "current" | "pending";

const ACTIVITY_STEPS = [
  { key: "published", label: "Request Published" },
  { key: "submissions", label: "Receiving Submissions" },
  { key: "evaluating", label: "Evaluation Started" },
  { key: "shortlisted", label: "Shortlist" },
] as const;

const getActivitySteps = (request: EmployerRequest) => {
  const deadlinePassed = new Date(request.deadline).getTime() < Date.now();
  const isEvaluating =
    request.status === "evaluating" ||
    request.status === "shortlisted" ||
    request.status === "closed";
  const isShortlisted =
    request.status === "shortlisted" || request.status === "closed";

  const completed = [
    !!request.published_at,
    !!request.published_at && deadlinePassed,
    isEvaluating,
    isShortlisted,
  ];

  const currentIndex = completed.findIndex((done) => !done);

  const subtext = [
    request.published_at ? formatDate(request.published_at) : "Not yet published",
    deadlinePassed
      ? "Submission window closed"
      : `Closes ${formatDate(request.deadline)}`,
    "Expert reviewers assigned",
    isShortlisted ? "Final shortlist delivered" : "Awaiting evaluation results",
  ];

  return ACTIVITY_STEPS.map((step, index) => ({
    ...step,
    subtext: subtext[index],
    state: (completed[index]
      ? "done"
      : index === currentIndex
      ? "current"
      : "pending") as ActivityState,
  }));
};

const RequestDetails = () => {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [request, setRequest] = useState<EmployerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (id) {
      employerService
        .getRequestById(id)
        .then(setRequest)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="loader" />
      </div>
    );
  if (!request) return <div>Request not found</div>;

  const requests = [request];

  const handleCloseRequest = () => {
    setShowModal(false);
    router.push("/requests");
  };

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-screen">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push("/requests")}
            className="text-sm text-gray-500"
          >
            ← Back to all requests
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-red-500 text-white px-4 py-2 rounded-md"
          >
            Close request
          </button>
        </div>

        {/* TITLE */}
        {requests.map((req) => (
          <div key={req.id} className="mb-6">
            <h1 className="text-2xl font-semibold">{req.title}</h1>
            <p className="text-gray-500 text-sm">
              ID: {req.id} • Date Created: {formatDate(req.created_at)}
            </p>
          </div>
        ))}

        {/* OVERVIEW */}
        <div className="bg-white rounded-xl p-5 shadow mb-6">
          <h2 className="font-semibold mb-4">Overview</h2>

          <div>
            {requests.map((item, index) => (
              <section key={index} className="grid grid-cols-3 gap-4">
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Submission Cap</p>
                  <h3 className="text-lg font-semibold">
                    {item.challenge_cap}
                  </h3>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Received Submissions</p>
                  <h3 className="text-lg font-semibold">
                    {item.received_submissions ?? 0}
                  </h3>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Shortlist size</p>
                  <h3 className="text-lg font-semibold">
                    {item.shortlist_size}
                  </h3>
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* BILLING */}
        <div className="bg-white rounded-xl p-5 shadow mb-6">
          <h2 className="font-semibold mb-4">Billing & Status</h2>

          <div className="grid grid-cols-3 gap-4">
            {requests.map((item, index) => (
              <div key={index} className="bg-gray-100 p-4 rounded-lg">
                <p className="text-xs text-gray-500">{item.title}</p>
                <h3 className="text-lg font-semibold text-red-500 capitalize">
                  {item.status}
                </h3>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVITY */}
        <div className="bg-white rounded-xl p-5 shadow">
          <h2 className="font-semibold mb-4">Activity</h2>

          <div className="relative flex justify-between items-start">
            <div className="absolute top-1.5 left-0 right-0 h-px bg-gray-200" />

            {getActivitySteps(request).map((step) => (
              <div
                key={step.key}
                className="relative z-10 flex flex-col items-center flex-1 text-center px-2"
              >
                <div
                  className={`w-3 h-3 rounded-full mb-2 ${
                    step.state === "done"
                      ? "bg-green-500"
                      : step.state === "current"
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                />
                <p
                  className={`text-sm font-semibold ${
                    step.state === "pending" ? "text-gray-400" : "text-gray-900"
                  }`}
                >
                  {step.label}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    step.state === "pending" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {step.subtext}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-87.5 text-center">
            <div className="text-red-500 text-2xl flex justify-center items-center mb-2">
              <TriangleAlert />
            </div>

            <h3 className="font-semibold mb-2">
              Are you sure you want to close this request?
            </h3>

            <p className="text-sm text-gray-500 mb-4">
              This action will delete the entire request from the database
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="border px-4 py-2 rounded-md w-full"
              >
                No, Cancel
              </button>

              <button
                onClick={handleCloseRequest}
                className="bg-red-500 text-white px-4 py-2 rounded-md w-full"
              >
                Yes, Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestDetails;
