"use client";
import { userAuth } from "@/lib/context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LogoutPage() {
  const router = useRouter();
  const logout = userAuth((state: any) => state.logout);

  useEffect(() => {
    logout();
    router.push("/auth/login");
  });

    return <p className="text-2xl h-screen flex items-center justify-center">Logging out...</p>;
}
