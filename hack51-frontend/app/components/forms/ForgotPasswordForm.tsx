"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { userAuth } from "@/lib/context";
import { toast } from "react-toastify";

export default function ForgotPasswordForm() {
  const forgotPassword = userAuth((state: any) => state.forgotPassword);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("OTP sent! Check your email.");
      router.push(`/auth/verify-reset-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Failed to send reset email. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-10 rounded-lg">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2">Forgot password?</h1>
        <p className="text-gray-600 mb-8 text-center">
          Enter your email and we'll send you a one-time code to reset your
          password.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={isLoading}
          />
          <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-[#FF0046] text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
        >
          {isLoading && <div className="loader" style={{ width: "16px" }} />}
          {isLoading ? "Sending..." : "Send reset code"}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Remember your password?{" "}
        <a href="/auth/login" className="text-[#FF0046] font-medium hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
