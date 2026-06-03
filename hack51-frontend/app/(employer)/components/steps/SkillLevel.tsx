"use client";

import { useRequestStore } from "@/lib/context/useRequestStore";

export default function SkillLevel() {
  const { role, role_level, setRoleLevel, nextStep } = useRequestStore();

  const skillLevels = role?.catalog_skill_levels ?? [];

  const handleSelect = (item: { id: string; level: string }) => {
    setRoleLevel(item);
    nextStep();
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-8 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl pb-3">
        Select skill level for the role
      </h2>
      {skillLevels.length === 0 ? (
        <p className="mt-6 text-gray-500 text-sm">No skill levels defined for this role.</p>
      ) : (
        skillLevels.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 p-4 mt-2 rounded-lg cursor-pointer border transition-colors ${
              role_level?.id === item.id
                ? "border-[#FF0046] bg-red-50"
                : "border-transparent hover:bg-gray-50"
            }`}
            onClick={() => handleSelect(item)}
          >
            <input
              type="radio"
              name="skill_level"
              checked={role_level?.id === item.id}
              readOnly
              className="accent-[#FF0046]"
            />
            <label className="cursor-pointer capitalize">{item.level.replace(/-/g, " ")}</label>
          </div>
        ))
      )}
    </div>
  );
}
