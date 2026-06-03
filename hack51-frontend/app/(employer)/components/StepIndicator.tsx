"use client";

import { useRequestStore } from "@/lib/context/useRequestStore";
import { stepConfig } from "./StepContent";

export default function StepIndicator({
  currentStep,
}: {
  currentStep: number;
}) {
const {step} = useRequestStore();

  const getStatusStyles = (status: "completed" | "current" | "pending") => {
    switch (status) {
      case "completed":
      case "current":
        return "bg-[#FF0046] text-white";
      default:
        return "bg-gray-300 text-gray-500";
    }
  };

  return (
    <div>
      <section className="indicators mt-6">
        <div className="bg-white p-4 gap-4 shadow rounded-2xl mx-auto w-full md:w-3/4 justify-center flex">
          {stepConfig.map((step, index) => {
            const isDone = index < currentStep - 1;
            const isActive = index === currentStep - 1;
            const status = isDone
              ? "completed"
              : isActive
                ? "current"
                : "pending";

            return (
              <div key={step.id} className="flex items-center gap-4">
                <div className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getStatusStyles(status)}`}
                  >
                    {index + 1}
                  </div>
                </div>
                {index !== stepConfig.length - 1 && (
                  <div
                    className={`flex-1 h-1 rounded-full ${isDone ? "bg-[#FF0046]" : "bg-gray-200"}`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>
      <div className="mt-2 text-xs text-gray-600 flex justify-between w-full md:w-3/4 mx-auto">
        {stepConfig.map((step, index) => (
          <span
            key={step.id}
            className={`w-[11%] text-center ${
              index === currentStep - 1
                ? "font-bold text-black"
                : "text-gray-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
