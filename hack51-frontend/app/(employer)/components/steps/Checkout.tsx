"use client";

import { useEffect, useMemo, useState } from "react";
import { EmployerRequest } from "@/types/employer";
import { employerService } from "@/lib/services/employer.service";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);

export default function Checkout() {
  const [checkoutRequest, setCheckoutRequest] =
    useState<EmployerRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCheckout() {
      try {
        const data = await employerService.getRequests({ page: 1, limit: 1 });
        if (Array.isArray(data) && data.length > 0) {
          setCheckoutRequest(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch checkout data", error);
      } finally {
        setLoading(false);
      }
    }

    loadCheckout();
  }, []);

  const totalCost = useMemo(
    () =>
      checkoutRequest
        ? checkoutRequest.admin_fee + checkoutRequest.deposit_amount
        : 0,
    [checkoutRequest],
  );

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl font-bold">Checkout</h2>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : checkoutRequest ? (
        <>
          <div className="flex items-center justify-between mt-6">
            <label className="block font-semibold">
              Admin Setup Fee (Fixed)
            </label>
            <span className="block px-4">
              {formatCurrency(checkoutRequest.admin_fee)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-4">
            <label className="block font-semibold">
              Verification cost per candidate
            </label>
            <span className="block px-4">
              {formatCurrency(checkoutRequest.deposit_amount)}
            </span>
          </div>

          <section className="bg-white rounded-xl mt-12">
            <h2 className="border-b border-b-gray-300 text-xl font-bold">
              Total Cost
            </h2>
            <div className="bg-[#FF0046] rounded-lg mt-4 p-4 w-full md:w-1/2 text-white">
              <span className="block text-2xl font-bold">
                {formatCurrency(totalCost)}
              </span>
            </div>
          </section>
        </>
      ) : (
        <p className="mt-6 text-gray-600">No checkout data available.</p>
      )}
    </div>
  );
}
