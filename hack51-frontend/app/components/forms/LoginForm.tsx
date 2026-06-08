"use client";
import { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { userAuth } from "@/lib/context";
import { LoginProps } from "@/types/auth";
import { authService } from "@/lib/services/auth.service";
import { toast } from "react-toastify";

export default function LoginForm() {
  const router = useRouter();
  const login = userAuth((state: any) => state.login);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const loginData: LoginProps = {
        email: formData.email,
        password: formData.password,
      };

      const data = await login(loginData);
      if (!data?.user) {
        throw new Error("User data not returned");
      }

      toast.success("Welcome back!");
      const route = authService.getRoleRoute(data.user.role);
      router.push(route);
    } catch (err: any) {
      // 403 with EMAIL_NOT_VERIFIED → redirect to verify page
      if (err?.status === 403 && err?.code === "EMAIL_NOT_VERIFIED") {
        toast.info("Please verify your email to continue.");
        router.push(`/auth/verify-email?email=${formData.email}`);
        return;
      }

      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg bg-white p-10 rounded-lg">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2">Welcome back !</h1>
        <p className="text-gray-600 mb-12">Sign in to your account</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="relative">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={isLoading}
          />
          <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={isLoading}
          />
          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-[#FF0046] text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
        >
          {isLoading && <div className="loader" style={{ width: "16px" }} />}
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Don't have an account?{" "}
        <a
          href="/auth/register"
          className="text-[#FF0046] font-medium hover:underline"
        >
          Create an account
        </a>
      </p>
    </div>
  );
}