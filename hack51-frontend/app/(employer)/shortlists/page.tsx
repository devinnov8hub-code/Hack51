import ChallengeButton from "../components/ChallengeButton";
import ShortlistTable from "../components/ShortlistTable";
import { useEffect, useState } from "react";
import { employerService } from "@/lib/services/employer.service";

export default function ShortlistPage() {
  return (
    <div>
      <section className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shortlists</h1>
          <p className="text-gray-600 mt-2">
            Manage the lifecycle of your hiring challenges across all statuses.
          </p>
        </div>
      </section>

      {/* tabs */}
      <section className="mt-6 border-b border-gray-200">
        <div>
          <button className="px-4 py-2 border-b-2 border-[#FF0046] text-[#FF0046] font-medium">
            Active Requests
          </button>
          <button className="px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Drafts
          </button>
          <button className="px-4 py-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Closed
          </button>
        </div>
      </section>

     
      <ShortlistTable />
     
    </div>
  );
}
