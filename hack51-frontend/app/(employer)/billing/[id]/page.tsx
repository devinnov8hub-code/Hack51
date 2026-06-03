import Link from "next/link";

type FeeCard = {
  label: string;
  sublabel: string;
  amount: number;
};

// Mock data 
const billingDetail = {
  title: "Senior Product Designer",
  reqId: "REQ-123-64",
  transactionId: "238uye7-3873ee-hagxy45",
  status: "Transaction Successful!",
  fees: [
    {
      label: "Admin Setup fee(fixed)",
      sublabel: "Charge per request",
      amount: 800000,
    },
    {
      label: "Fee Per candidate shortlist( x4)",
      sublabel: "Charge per candidate @64,000",
      amount: 800000,
    },
    {
      label: "Prepaid Deposit",
      sublabel: "Admin + Shortlist fee",
      amount: 980000,
    },
    {
      label: "Full candidate list purchase(x12)",
      sublabel: "Charge per candidate @64,000",
      amount: 800000,
    },
  ] as FeeCard[],
  total: 993000,
};

const formatAmount = (amount: number) =>
  amount.toLocaleString("en-NG");

export default function BillingDetailPage() {
  const { title, reqId, transactionId, status, fees, total } = billingDetail;

  return (
    <div>
      {/* Back link */}
      <Link
        href="/billing"
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Back to Billing
      </Link>

      {/* Title */}
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-gray-500 mt-1">{reqId}</p>

      {/* Badges */}
      <div className="flex flex-wrap gap-3 mt-4">
        <span className="bg-blue-100 text-blue-700 border border-blue-200 text-sm px-4 py-1.5 rounded-full">
          Transaction ID: {transactionId}
        </span>
        <span className="bg-teal-100 text-teal-700 border border-teal-200 text-sm px-4 py-1.5 rounded-full">
          Status: {status}
        </span>
      </div>

      {/* Purchase details card */}
      <div className="mt-8 bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-bold mb-6">Request Purchase</h2>

        {/* 2x2 fee grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fees.map((fee, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl px-5 py-4 flex items-start justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{fee.label}</p>
                <p className="text-gray-400 text-sm mt-1">{fee.sublabel}</p>
              </div>
              <p className="text-[#FF0046] font-bold text-lg ml-4 whitespace-nowrap">
                {formatAmount(fee.amount)}
              </p>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-4">Total  fee Paid</h3>
          <div className="bg-[#FF0046] text-white rounded-xl px-8 py-6 inline-block">
            <p className="text-4xl font-bold">₦{formatAmount(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
