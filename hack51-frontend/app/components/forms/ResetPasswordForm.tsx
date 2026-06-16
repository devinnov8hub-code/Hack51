"use client";
import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { userAuth } from "@/lib/context";
import { toast } from "react-toastify";

export default function ResetPasswordForm() {
  const resetPassword = userAuth((state: any) => state.resetPassword);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!resetToken) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ reset_token: resetToken, new_password: newPassword });
      toast.success("Password reset successful! Please sign in.");
      router.push("/auth/login");
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Failed to reset password. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-10 rounded-lg">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2">Set new password</h1>
        <p className="text-gray-600 mb-8 text-center">
          Choose a strong password for your account.
        </p>
      </div>

      {!resetToken && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
          Invalid or expired reset link.{" "}
          <a href="/auth/forgot-password" className="underline font-medium">
            Request a new one
          </a>
          .
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={isLoading || !resetToken}
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
            disabled={isLoading || !resetToken}
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
          disabled={isLoading || !resetToken}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-[#FF0046] text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
        >
          {isLoading && <div className="loader" style={{ width: "16px" }} />}
          {isLoading ? "Updating..." : "Update password"}
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
