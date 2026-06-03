"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface RejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  candidateName?: string;
}

export default function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
}: RejectModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(240,30,90,0.08)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-8 w-110 max-w-[95vw] relative shadow-2xl border border-pink-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} className="text-[#F01E5A]" />
        </div>

        <h2 className="text-center text-[17px] font-bold mb-5">
          Reason for rejecting submission
        </h2>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejecting submission..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-(family-name:--font-dm-sans) text-gray-800 bg-gray-50 resize-none h-28 outline-none focus:border-[#F01E5A] transition-colors placeholder:text-gray-400 italic"
        />

        <button
          onClick={handleConfirm}
          className="w-full mt-4 bg-[#F01E5A] hover:bg-[#c0144a] text-white py-3.5 rounded-xl text-sm font-bold transition-colors"
        >
          Reject Submission
        </button>
      </div>
    </div>
  );
}
