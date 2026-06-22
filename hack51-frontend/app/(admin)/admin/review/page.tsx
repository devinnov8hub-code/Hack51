"use client";

import ReviewTable from "../components/ReviewTable";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {  reviewService } from "@/lib/services/review.service";


export default function RequestsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"active requests" | "shortlists">(
    "active requests",
  );


  return (
    <div>
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Review</h1>
          <p className="text-gray-600 mt-2">
            Evaluate requests and shortlist candidates
          </p>
        </div>
        {/* <ChallengeButton /> */}
      </section>

      {/* tabs */}
      <section className="mt-6 border-b border-gray-200">
        <div>
          <button
            className="px-4 py-2 border-b-2 border-[#FF0046] text-[#FF0046] font-medium"
            onClick={() => setActiveTab("active requests")}
          >
            Active Requests
          </button>
          {/* <button
            onClick={() => router.push("/admin/shortlists")}
            className="px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Shortlisted Candidates
          </button> */}
       
        </div>
      </section>

      <div className="flex flex-col md:flex-row justify-between items-center mt-6 gap-4">
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

      <section className="mt-6 shadow bg-white p-6 rounded-2xl">
        <ReviewTable/>
      </section>


      <div className="flex justify-end items-center mt-4 gap-2">
        <button className="px-4 py-2 border border-[#FF0046] rounded text-[#FF0046] hover:bg-gray-50">
          PREV
        </button>
        <button className="px-4 py-2 border border-[#FF0046] rounded text-[#FF0046] hover:bg-gray-50">
          NEXT
        </button>
      </div>
    </div>
  );
}
