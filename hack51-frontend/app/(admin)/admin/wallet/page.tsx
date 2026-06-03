"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const portfolioData = [
  { month: "Jan", value: 280000000000 },
  { month: "Feb", value: 240000000000 },
  { month: "Mar", value: 380000000000 },
  { month: "Apr", value: 360000000000 },
  { month: "May", value: 320000000000 },
  { month: "Jun", value: 440000000000 },
  { month: "Jul", value: 790000000000 },
  { month: "Aug", value: 710000000000 },
  { month: "Sep", value: 660000000000 },
  { month: "Oct", value: 620000000000 },
  { month: "Nov", value: 540000000000 },
  { month: "Dec", value: 600000000000 },
];

const transactions = [
  {
    requestId: "Req-ID-23405-34",
    role: "Software Engineer",
    transactionId: "23buy87-3873ee-hagyx45",
    status: "Successful",
  },
  {
    requestId: "Req-ID-23405-35",
    role: "Product Designer",
    transactionId: "81buj42-4332zx-bnmkd21",
    status: "Failed",
  },
  {
    requestId: "Req-ID-23405-36",
    role: "Frontend Developer",
    transactionId: "13tyu77-9922aa-nmopq76",
    status: "Successful",
  },
  {
    requestId: "Req-ID-23405-37",
    role: "Data Analyst",
    transactionId: "39rew18-5521cc-kgtyu86",
    status: "Successful",
  },
  {
    requestId: "Req-ID-23405-38",
    role: "DevOps Engineer",
    transactionId: "44qaz21-1122dd-pplok09",
    status: "Failed",
  },
];

const filters = ["24h", "7d", "1m", "1y", "All time"];

export default function AdminWalletPage() {
  const [activeFilter, setActiveFilter] = useState("All time");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((item) =>
        [item.requestId, item.role, item.transactionId, item.status]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-gray-500">
              Wallet
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Profit Overview
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <span className="text-sm font-medium text-slate-600">
              Increased by
            </span>
            <span className="rounded-full bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-600">
              300%
            </span>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Portfolio</p>
              <p className="mt-2 text-4xl font-semibold text-slate-900">
                ₦300,000,000,000.45
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFilter === filter
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-slate-700 hover:bg-gray-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={portfolioData}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorPortfolio"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#ff0046" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff0046" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#E5E7EB"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6B7280", fontSize: 13 }}
                />
                <YAxis
                  tickFormatter={(value) =>
                    `₦${(value / 1_000_000_000).toFixed(0)}b`
                  }
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6B7280", fontSize: 13 }}
                />
                <Tooltip
                  formatter={(value) => {
                    if (typeof value === "number") {
                      return [`₦${value.toLocaleString()}`, "Portfolio"];
                    }
                    return ["", "Portfolio"];
                  }}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ff0046"
                  fill="url(#colorPortfolio)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: "#ff0046" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Transaction History
            </h2>
            <p className="text-sm text-gray-500">
              Review your recent payouts and role payments.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="sr-only" htmlFor="search">
              Search transactions
            </label>
            <input
              id="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by id, name, role..."
              className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-red-500 focus:bg-white"
            />
            <button
              type="button"
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-gray-50"
            >
              Filter
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Request ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Role title
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Transaction ID
                </th>
                <th className="px-4 py-3 font-semibold text-slate-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredTransactions.map((txn) => (
                <tr
                  key={txn.transactionId}
                  className="transition hover:bg-gray-50"
                >
                  <td className="px-4 py-4 text-slate-900 font-medium">
                    {txn.requestId}
                  </td>
                  <td className="px-4 py-4 text-slate-700">{txn.role}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {txn.transactionId}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        txn.status === "Successful"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    No transactions match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
