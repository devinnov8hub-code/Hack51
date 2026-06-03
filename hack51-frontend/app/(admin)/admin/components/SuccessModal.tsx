"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SuccessModal({
  isOpen,
  onClose,
  onConfirm,
}: SuccessModalProps) {
  const handleSave = () => {
    onConfirm();
    onClose();
  };

  if (!isOpen) return null;

  const router = useRouter();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,200,0,0.08)",
        backdropFilter: "blur(3px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-8 w-110 max-w-[95vw] relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-500" />
        </div>

        <h2 className="text-center text-[17px] font-bold mb-5">
          Role creation successful
        </h2>
        <p>Role can now be accessed by employers</p>

        <button
          onClick={() => router.push("/admin/catalog/roles")}
          className="w-full mt-4 bg-[#F01E5A] hover:bg-[#c0144a] text-white py-3.5 rounded-xl text-sm font-bold transition-colors"
        >
          Back to Catalog
        </button>
      </div>
    </div>
  );
}
