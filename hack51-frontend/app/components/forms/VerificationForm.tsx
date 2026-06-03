"use client";

import { useState } from "react";
import { userAuth } from "@/lib/context";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import MailImg from "@/public/email-with-at-sign-and-paper-airplane 1.png";
import { toast } from "react-toastify";

export default function Verification() {
  const verifyEmail = userAuth((state: any) => state.verifyEmail);
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string, index: number) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    //move to next input
    if (index < 5 && value) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      toast.warning("Please enter the complete 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await verifyEmail({
        email: searchParams.get("email") || "",
        otp: otpCode,
      });

      toast.success("Email verified! Redirecting to login...");
      router.push("/auth/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center justify-center m-auto w-full max-w-md p-6 border border-[#FF0046] rounded-lg shadow-md">
        <Image
          src={MailImg}
          alt="Email"
          width={50}
          height={50}
          className="mb-6"
        />

        <h1 className="text-4xl font-bold mb-4 text-[#FF0046]">
          Email Verification
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Check your inbox and write the six-digit code we sent in the space
          below
        </p>
        <p className="text-gray-600">
          If you haven't received the email, please check your spam folder or{" "}
          <a href="#" className="text-[#FF0046] font-medium hover:underline">
            resend the verification email
          </a>
          .
        </p>

        <form onSubmit={handleVerify} className="w-full">
          <div className="flex justify-center mt-4">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                className="w-10 h-10 text-center border border-gray-300 rounded-md mx-1 focus:outline-none focus:ring-2 focus:ring-[#FF0046] focus:border-transparent disabled:opacity-50"
                maxLength={1}
                value={digit}
                disabled={loading}
                onChange={(e) => handleChange(e.target.value, index)}
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-[#FF0046] text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
            >
              {loading && <div className="loader" style={{ width: "16px" }} />}
              {loading ? "Verifying..." : "Verify Email"}
            </button>
          </div>
        </form>
        <div className="mt-3">
          <button
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            onClick={() => router.push("/auth/login")}
          >
            Back to Login
          </button>
        </div>
      </div>
    </section>
  );
}
