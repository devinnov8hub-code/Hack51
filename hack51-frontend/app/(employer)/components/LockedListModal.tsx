import { LockKeyhole, X } from "lucide-react";
import { useState } from "react";
import { LockedTalentModal } from "@/types/modal";

export default function TalentListModal({
  isOpen,
  onClose,
}: LockedTalentModal) {
  const handleConfirm = () => {};

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(101,90,91, 0.10)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-8 w-[440px] max-w-[95vw] relative shadow-2xl border border-pink-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-4">
          <LockKeyhole size={24} className="text-[#F01E5A]" />
        </div>

        {/* Content */}
        <h2 className="text-center text-xl font-bold text-gray-900 mb-2">
          Access the full talent list
        </h2>
        <p className="text-center text-sm text-gray-600 mb-6">
          Go beyond the Top N to view scores and feedback for every candidate
          who completed the challenge.
        </p>

        <button
          onClick={handleConfirm}
          className="w-full bg-[#F01E5A] hover:bg-[#c0144a] text-white py-3.5 rounded-xl text-sm font-bold transition-colors"
        >
          Pay N240000 to Unlock
        </button>
      </div>
    </div>
  );
}
