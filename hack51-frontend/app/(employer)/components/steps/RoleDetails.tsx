"use client";

import { useRequestStore } from "@/lib/context/useRequestStore";

export default function RoleDetails() {
  const { role, role_level } = useRequestStore();

  if (!role) return null;

  const skillLevels = role.catalog_skill_levels ?? [];

  const capabilities = (role as any).catalog_capabilities ?? [];

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-10 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl pb-3">Role Details</h2>

      <div className="flex items-center mt-4">
        <label className="font-semibold w-32">Role Title</label>
        <span className="text-gray-700">{role.name}</span>
      </div>
      <div className="flex items-center mt-3">
        <label className="font-semibold w-32">Skill Level</label>
        <span className="text-gray-700 capitalize">
          {role_level?.level.replace(/-/g, " ") || "—"}
        </span>
      </div>

      {capabilities.length > 0 && (
        <div className="mt-8">
          <h2 className="border-b border-b-gray-300 text-xl pb-3">
            Role Capabilities
          </h2>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {capabilities.map((cap: any, i: number) => (
              <div
                key={i}
                className="border border-gray-100 bg-gray-50 p-5 rounded-lg"
              >
                <h3 className="font-semibold border-b border-gray-200 pb-2">
                  {cap.title}
                </h3>
                <p className="mt-3 text-sm text-gray-600">{cap.summary}</p>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
