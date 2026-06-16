"use client";
import { useRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { userAuth } from "@/lib/context";
import { toast } from "react-toastify";

export default function VerifyResetOtpForm() {
  const verifyResetOtp = userAuth((state: any) => state.verifyResetOtp);
  const forgotPassword = userAuth((state: any) => state.forgotPassword);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [isResending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otp];
    pasted.split("").forEach((char, i) => {
      if (i < 6) updated[i] = char;
    });
    setOtp(updated);
    const nextEmpty = updated.findIndex((v) => !v);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await forgotPassword(email);
      toast.info("A new code has been sent to your email.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otpString = otp.join("");
    if (otpString.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter your new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await verifyResetOtp({ email, otp: otpString, new_password: newPassword });
      toast.success("Password reset successful! Please sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Failed to verify code. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-10 rounded-lg">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2">Reset password</h1>
        <p className="text-gray-600 mb-1 text-center">
          Enter the 6-digit code sent to
        </p>
        <p className="text-[#FF0046] font-medium mb-8 text-center truncate max-w-xs">
          {email}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP inputs */}
        <div
          className="flex justify-between gap-2"
          onPaste={handleOtpPaste}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
              disabled={isLoading}
            />
          ))}
        </div>

        <p className="text-center text-sm text-gray-500">
          Didn't receive a code?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-[#FF0046] font-medium hover:underline disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend"}
          </button>
        </p>

        {/* New password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={isLoading}
          />
          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Confirm password */}
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={isLoading}
          />
          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirm ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-[#FF0046] text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
        >
          {isLoading && <div className="loader" style={{ width: "16px" }} />}
          {isLoading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Back to{" "}
        <a
          href="/auth/login"
          className="text-[#FF0046] font-medium hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
