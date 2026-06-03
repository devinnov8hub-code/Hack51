"use client";

import { useEffect, useState } from "react";
import { employerService } from "@/lib/services/employer.service";
import { EmployerRoles } from "@/types/catalog";
import { useRequestStore } from "@/lib/context/useRequestStore";

export default function SelectRole() {
  const [roles, setRoles] = useState<EmployerRoles[]>([]);
  const [loading, setLoading] = useState(false);
  const { role, setRole, nextStep } = useRequestStore();

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const response = await employerService.getRoles();
        setRoles(response);
      } catch (err: any) {
        console.error("Error fetching roles", err.message || err?.response?.data);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleSelect = (selected: EmployerRoles) => {
    setRole(selected);
    nextStep();
  };

  if (loading) return <div className="loader mx-auto my-24"></div>;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-8 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl">
        Select one from existing roles
      </h2>
      {roles.map((r) => (
        <div
          key={r.id}
          className="p-4 mt-4 gap-4 cursor-pointer hover:bg-gray-100 flex items-center"
          onClick={() => handleSelect(r)}
        >
          <input
            type="radio"
            name="role"
            value={r.id}
            checked={role?.id === r.id}
            readOnly
            className="rounded-full p-2 checked:bg-red-700"
          />
          <label className="ml-3 cursor-pointer">{r.name}</label>
        </div>
      ))}
    </div>
  );
}
