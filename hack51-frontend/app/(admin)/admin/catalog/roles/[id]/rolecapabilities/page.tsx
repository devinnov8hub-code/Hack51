"use client";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, PlusCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { catalogService } from "@/lib/services/catalog.service";
import { toast } from "react-toastify";
import { Capability } from "@/types/catalog";

const MAX_CAPABILITIES = 3;
const MAX_UNITS = 5;
  

export default function RoleCapabilities() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [roleDetails, setRoleDetails] = useState({
    name: "",
    skill_levels: "",
  });
  const [savedSkillLevels, setSavedSkillLevels] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([
    { title: "", summary: "", competency_units: [] },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    catalogService
      .getRoleById(id)
      .then((res) => {
        const role = res?.data ?? res;

        // Skill levels — handle both string[] and {id, level}[] formats
        const rawLevels: any[] =
          role?.catalog_skill_levels ?? role?.skill_levels ?? [];
        const skillLevel = rawLevels
          .map((item) =>
            typeof item === "string" ? item : (item?.level ?? item?.name ?? ""),
          )
          .filter(Boolean)
          .join(", ");

        setRoleDetails({ name: role?.name ?? "", skill_levels: skillLevel });
        setSavedSkillLevels(
          rawLevels.map((item: any) =>
            typeof item === "string" ? item : (item?.level ?? ""),
          ),
        );

        const existingCaps: any[] =
          role?.catalog_capabilities ?? role?.capabilities ?? [];
        if (existingCaps.length) {
          setCapabilities(
            existingCaps.slice(0, MAX_CAPABILITIES).map((c) => ({
              ...(c.id ? { id: c.id } : {}),
              title: c.title ?? "",
              summary: c.summary ?? "",
              competency_units: (c.competency_units ?? []).map((u: any) => ({
                ...(u.id ? { id: u.id } : {}),
                title: u.title ?? "",
                summary: u.summary ?? "",
              })),
            })),
          );
        }
      })
      .catch((err: any) => {
        console.error("ERROR FETCHING ROLE", err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCapabilityChange = (
    index: number,
    field: keyof Capability,
    value: string,
  ) => {
    setCapabilities((prev) =>
      prev.map((cap, i) => (i === index ? { ...cap, [field]: value } : cap)),
    );
  };

  const addCapability = () => {
    if (capabilities.length < MAX_CAPABILITIES) {
      setCapabilities((prev) => [...prev, { title: "", summary: "" ,competency_units: []  }]);
    }
  };

  const removeCapability = (index: number) => {
    if (capabilities.length > 1) {
      setCapabilities((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const addUnit = (capIndex: number) => {
    setCapabilities((prev) =>
      prev.map((c, i) =>
        i === capIndex
          ? {
              ...c,
              competency_units: [
                ...(c.competency_units ?? []),
                { title: "", summary: "" },
              ],
            }
          : c,
      ),
    );
  };

  const removeUnit = (capIndex: number, unitIndex: number) => {
    setCapabilities((prev) =>
      prev.map((c, i) =>
        i === capIndex
          ? {
              ...c,
              competency_units: (c.competency_units ?? []).filter(
                (_, ui) => ui !== unitIndex,
              ),
            }
          : c,
      ),
    );
  };

  const handleUnitChange = (
    capIndex: number,
    unitIndex: number,
    value: string,
  ) => {
    setCapabilities((prev) =>
      prev.map((c, i) =>
        i === capIndex
          ? {
              ...c,
              competency_units: (c.competency_units ?? []).map((u, ui) =>
                ui === unitIndex ? { ...u, title: value } : u,
              ),
            }
          : c,
      ),
    );
  };

  const handleSave = async () => {
    const filled = capabilities
      .filter((c) => c.title.trim())
      .map((c) => ({
        ...(c.id ? { id: c.id } : {}),
        title: c.title,
        summary: c.summary,
        competency_units: (c.competency_units ?? [])
          .filter((unit) => unit.title.trim())
          .map((unit) => ({
            ...(unit.id ? { id: unit.id } : {}),
            title: unit.title,
            summary: unit.summary ?? "",
          })),
      }));

    if (!filled.length) {
      alert(
        "Please add at least one capability with a title before continuing.",
      );
      return;
    }
    setSaving(true);
    try {
      await catalogService.updateRole(id, {
        name: roleDetails.name,
        skill_levels: savedSkillLevels as any,
        capabilities: filled,
      });
      router.push(`/admin/catalog/challenges/?catalog_role_id=${id}`);
    } catch (err: any) {
      console.error("ERROR UPDATING CAPABILITIES", err?.message || err);

      toast.error(err?.message || "Failed to update capabilities");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <span
        onClick={() => router.push(`/admin/catalog/roles/${id}/skills`)}
        className="cursor-pointer hover:text-red-700 my-5 text-sm text-gray-500 flex items-center gap-1 w-fit"
      >
        <ArrowLeftIcon size={14} />
        Previous: Skill Level
      </span>

      <div>
        <h1 className="text-2xl font-bold mb-1">Catalog</h1>
        <p className="text-gray-600 mb-6">Manage roles and challenges</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-md w-full mt-4 md:w-3/4 mx-auto">
        <div className="flex justify-between items-center border-b border-gray-200 pb-4">
          <h2 className="text-xl font-semibold">Role Details</h2>
          <button
            className="px-5 py-2.5 bg-[#F01E5A] hover:bg-[#c0144a] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm mt-6">Loading role details...</p>
        ) : (
          <div className="flex flex-col mt-4">
            <div>
              <p className="font-semibold text-sm">Role Title</p>
              <p className="text-gray-700 mt-1">{roleDetails.name || "—"}</p>
            </div>
            <div className="mt-4">
              <p className="font-semibold text-sm">Role Level</p>
              <p className="text-gray-700 mt-1 capitalize">
                {savedSkillLevels.length > 0
                  ? savedSkillLevels.join(", ")
                  : "—"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h2 className="text-lg font-semibold">Role Capabilities</h2>
            {capabilities.length < MAX_CAPABILITIES && (
              <button
                onClick={addCapability}
                className="flex items-center gap-1.5 text-sm text-[#F01E5A] hover:text-[#c0144a] font-medium transition"
              >
                <PlusCircle size={16} />
                Add Capability
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {capabilities.map((cap, index) => (
              <div
                key={index}
                className="border border-gray-100 bg-gray-50 p-5 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Capability {index + 1}
                  </span>
                  {capabilities.length > 1 && (
                    <button onClick={() => removeCapability(index)}>
                      <Trash2
                        size={15}
                        className="text-gray-400 hover:text-red-500 transition"
                      />
                    </button>
                  )}
                </div>

                <input
                  className="border-b border-gray-200 p-3 w-full bg-white rounded focus:outline-none focus:ring-1 focus:ring-[#FF0046]"
                  placeholder="Enter Capability Title"
                  value={cap.title}
                  onChange={(e) =>
                    handleCapabilityChange(index, "title", e.target.value)
                  }
                />

                <textarea
                  className="mt-3 p-3 border border-gray-200 rounded-lg w-full bg-white focus:outline-none focus:ring-1 focus:ring-[#FF0046] resize-none"
                  placeholder="Describe the capability summary"
                  rows={3}
                  value={cap.summary}
                  onChange={(e) =>
                    handleCapabilityChange(index, "summary", e.target.value)
                  }
                />

                <div className="mt-3 pl-3 border-l-2 border-gray-200">
                  <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                    Competency Units
                  </p>

                  {(cap.competency_units ?? []).length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {cap.competency_units.map((unit: any, uIndex: number) => (
                        <div key={uIndex} className="flex items-center gap-1.5 group">
                          <input
                            className="text-sm border-b border-gray-200 px-2 py-1.5 w-full bg-transparent rounded focus:outline-none focus:ring-1 focus:ring-[#FF0046]/60"
                            placeholder={`Competency unit ${uIndex + 1}`}
                            value={unit.title}
                            onChange={(e) =>
                              handleUnitChange(index, uIndex, e.target.value)
                            }
                          />
                          <button
                            onClick={() => removeUnit(index, uIndex)}
                            className="opacity-0 group-hover:opacity-100 transition shrink-0"
                            title="Remove competency unit"
                          >
                            <Trash2
                              size={13}
                              className="text-gray-400 hover:text-red-500 transition"
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(cap.competency_units ?? []).length < MAX_UNITS && (
                    <button
                      onClick={() => addUnit(index)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#F01E5A] font-medium transition"
                    >
                      <PlusCircle size={13} />
                      Add Competency Unit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-3">
            {capabilities.length}/{MAX_CAPABILITIES} capabilities added
          </p>
        </div>
      </div>
    </section>
  );
}
