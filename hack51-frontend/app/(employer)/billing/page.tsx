"use client";
import Link from "next/link";
import { Eye } from "lucide-react";

type Transaction = {
  id: string;
  title: string;
  reqId: string;
  date: string;
  initialDeposit: number;
  submissionBilled: number | null;
  finalAmountBilled: number;
  status: "Pending" | "Paid" | "Failed";
};

const transactions: Transaction[] = [
  {
    id: "1",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: null,
    finalAmountBilled: 1200000,
    status: "Pending",
  },
  {
    id: "2",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: null,
    finalAmountBilled: 1200000,
    status: "Pending",
  },
  {
    id: "3",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: 34,
    finalAmountBilled: 1200000,
    status: "Pending",
  },
  {
    id: "4",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: 34,
    finalAmountBilled: 1200000,
    status: "Pending",
  },
  {
    id: "5",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: 34,
    finalAmountBilled: 1200000,
    status: "Pending",
  },
  {
    id: "6",
    title: "Senior Product Designer",
    reqId: "REQ-1232-34",
    date: "2024-05-12",
    initialDeposit: 980000,
    submissionBilled: 34,
    finalAmountBilled: 1200000,
    status: "Paid",
  },
];

const formatAmount = (amount: number) =>
  `₦${amount.toLocaleString("en-NG")}`;

const statusStyles: Record<Transaction["status"], string> = {
  Pending: "bg-blue-100 text-blue-600 border border-blue-300",
  Paid: "bg-green-100 text-green-600 border border-green-300",
  Failed: "bg-red-100 text-red-600 border border-red-300",
};

export default function BillingPage() {
  const currentPage = 1;
  const totalPages = 4;

  return (
    <div>
      {/* Header */}
      <section className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-gray-500 mt-1">
            Manage deposits, settlements, credits, and Invoices.
          </p>
        </div>
        <div className="bg-[#FF0046] text-white rounded-xl px-6 py-4 min-w-[220px] text-right">
          <p className="text-sm font-medium">Available Credit</p>
          <p className="text-3xl font-bold mt-1">₦4,000,000</p>
        </div>
      </section>

      {/* Transactions Table */}
      <section className="mt-8 bg-white rounded-2xl shadow p-6">
        {/* Table header controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-lg font-semibold">All Transactions</h2>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#FF0046] w-56"
              />
            </div>
            <button className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Filter Transactions
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="text-left py-3 px-2 font-semibold">Request Title</th>
                <th className="text-left py-3 px-2 font-semibold">Initial deposit</th>
                <th className="text-left py-3 px-2 font-semibold">Submission billed</th>
                <th className="text-left py-3 px-2 font-semibold">Final amount billed</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
                <th className="text-left py-3 px-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-4 px-2">
                    <p className="font-semibold text-gray-900">{tx.title}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {tx.reqId} &nbsp; {tx.date}
                    </p>
                  </td>
                  <td className="py-4 px-2 font-medium">{formatAmount(tx.initialDeposit)}</td>
                  <td className="py-4 px-2 font-medium">
                    {tx.submissionBilled !== null ? tx.submissionBilled : "-"}
                  </td>
                  <td className="py-4 px-2 font-medium">{formatAmount(tx.finalAmountBilled)}</td>
                  <td className="py-4 px-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[tx.status]}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <Link
                      href={`/billing/${tx.id}`}
                      className="flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 w-fit"
                    >
                      View <Eye size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <button
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            disabled={currentPage === 1}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`w-8 h-8 rounded text-sm font-medium ${
                  page === currentPage
                    ? "text-[#FF0046] font-bold"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-1 text-sm text-[#FF0046] font-medium hover:opacity-80">
            Next
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  );
}
