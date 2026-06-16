"use client";
import { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { userAuth } from "@/lib/context";
import { UserRole } from "@/types/user";
import { RegisterProps } from "@/types/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

export default function RegisterForm() {
  const register = userAuth((state: any) => state.register);
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: selectedRole,
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (
      !formData.email ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.password
    ) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!selectedRole) {
      setError("Please select a role");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const registrationData: RegisterProps = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
      };
      await register(registrationData);
      toast.success("Registration successful! Please verify your email.");
      router.push(`/auth/verify-email?email=${formData.email}`);
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Registration failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white p-6 sm:p-8 rounded-lg">
      <div className="flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold mb-2">Create an account</h1>
        <p className="text-gray-600 mb-8">Enter your details to get started</p>
      </div>

      {/* Role Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          I am registering as:
        </label>
        <div className="space-y-3">
          {["employer", "candidate"].map((role) => (
            <label key={role} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="role"
                value={role}
                checked={selectedRole === role}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="ml-3 text-gray-700 capitalize">{role}</span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row w-full gap-3">
          {/* firstName */}
          <div className="relative w-full">
            <input
              type="text"
              name="firstName"
              placeholder="Enter first name"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
              disabled={loading}
            />
            <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>

          {/* lastName */}
          <div className="relative w-full">
            <input
              type="text"
              name="lastName"
              placeholder="Enter last name"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
              disabled={loading}
            />
            <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Email */}
        <div className="relative">
          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={loading}
          />
          <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter a strong password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={loading}
          />
          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowPassword((pass) => !pass)}
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

        {/* Confirm Password */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF0046]"
            disabled={loading}
          />
          <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((pass) => !pass)}
            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 flex items-center justify-center gap-2 bg-[#FF0046] text-white py-2 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-default"
        >
          {loading && <div className="loader" style={{ width: "16px" }} />}
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Already have an account?{" "}
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
