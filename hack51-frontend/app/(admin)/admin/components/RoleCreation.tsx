"use client";

import {
  PlusCircle,
  Pencil,
  Trash2,
  Check,
  ChevronRight,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { catalogService } from "@/lib/services/catalog.service";
import { toast } from "react-toastify";

type Role = {
  id: string;
  name: string;
  isEditing: boolean;
  isTemp?: boolean;
};

export default function RoleCreation() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // =========================
  // FETCH ROLES
  // =========================
  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);

      try {
        const response = await catalogService.getRoles();

        setRoles(response);

        toast.success("Roles loaded successfully");
      } catch (err: any) {
        console.error(
          "ERROR FETCHING ROLES",
          err?.response?.data || err?.message,
        );

        toast.error("Failed to load roles");
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, []);

  // =========================
  // CREATE TEMP ROLE (FOR UI ONLY)
  // =========================
  const createRoleButton = () => {
    setRoles((prev) => [
      {
        id: crypto.randomUUID(),
        name: "",
        isEditing: true,
        isTemp: true,
      },
      ...prev,
    ]);
  };

  // =========================
  // CREATE ROLE
  // =========================
  const handleCreate = async (roleId: string) => {
    const currentRole = roles.find((r) => r.id === roleId);

    if (!currentRole?.name.trim()) return;

    try {
      const createdRole = await catalogService.createRole({
        name: currentRole.name,
      });

      setRoles((prev) => {
        const filtered = prev.filter((r) => r.id !== roleId);

        return [
          {
            id: createdRole.id,
            name: createdRole.name,
            isEditing: false,
            isTemp: false,
          },
          ...filtered,
        ];
      });

      toast.success("Role created successfully");
    } catch (err: any) {
      console.error("ERROR CREATING ROLE", err?.response?.data || err?.message);

      toast.error("Failed to create role");
    }
  };

  // =========================
  // EDIT MODE
  // =========================
  const handleEdit = (id: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === id ? { ...role, isEditing: true } : role,
      ),
    );
  };

  // =========================
  // UPDATE ROLE
  // =========================
  const handleSaveEdit = async (id: string) => {
    const currentRole = roles.find((r) => r.id === id);

    if (!currentRole?.name.trim()) return;

    try {
      const response = await catalogService.updateRole(id, {
        name: currentRole.name,
      });

      const updatedRole = response;

      setRoles((prev) =>
        prev.map((role) =>
          role.id === id
            ? {
                ...role,
                name: updatedRole?.name ?? currentRole.name,
                isEditing: false,
                isTemp: false,
              }
            : role,
        ),
      );

      toast.success("Role updated successfully");
    } catch (err: any) {
      console.error("ERROR UPDATING ROLE", err?.response?.data || err?.message);

      toast.error("Failed to update role");
    }
  };

  // =========================
  // DELETE ROLE
  // =========================
  const handleDelete = async (id: string) => {
    try {
      await catalogService.deleteRole(id);

      setRoles((prev) => prev.filter((role) => role.id !== id));

      toast.success("Role deleted successfully");
    } catch (err: any) {
      console.error("ERROR DELETING ROLE", err?.response?.data || err?.message);

      toast.error("Failed to delete role");
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm w-full mt-8 md:w-3/4 mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-b-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-800">Roles Created</h2>

        <button
          onClick={createRoleButton}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg"
        >
          Create new role
          <PlusCircle size={18} />
        </button>
      </div>

      {/* BODY */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      ) : (
        <div className="mt-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="group flex items-center justify-between py-3 border-b border-b-gray-200 last:border-none"
            >
              {/* LEFT */}
              <div className="flex items-center gap-3 w-full">
                <ChevronRight
                  className="text-gray-400 cursor-pointer"
                  size={18}
                  onClick={() =>
                    router.push(`/admin/catalog/roles/${role.id}/skills`)
                  }
                />

                {role.isEditing ? (
                  <input
                    type="text"
                    value={role.name}
                    autoFocus
                    placeholder="Type role name..."
                    onChange={(e) =>
                      setRoles((prev) =>
                        prev.map((r) =>
                          r.id === role.id ? { ...r, name: e.target.value } : r,
                        ),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        role.isTemp
                          ? handleCreate(role.id)
                          : handleSaveEdit(role.id);
                      }
                    }}
                    className="w-full bg-red-50 border border-red-200 px-3 py-2 rounded-md outline-none focus:ring-2 focus:ring-red-200"
                  />
                ) : (
                  <p className="text-gray-800">
                    {role.name || "Untitled Role"}
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition">
                {role.isEditing ? (
                  <Check
                    size={18}
                    className="cursor-pointer text-green-600"
                    onClick={() =>
                      role.isTemp
                        ? handleCreate(role.id)
                        : handleSaveEdit(role.id)
                    }
                  />
                ) : (
                  <Pencil
                    size={18}
                    className="cursor-pointer text-gray-500 hover:text-black"
                    onClick={() => handleEdit(role.id)}
                  />
                )}

                <Eye
                  size={18}
                  className="cursor-pointer text-gray-400 hover:text-blue-500"
                  onClick={() =>
                    router.push(`/admin/catalog/roles/${role.id}/view`)
                  }
                />

                <Trash2
                  size={18}
                  className="cursor-pointer text-gray-400 hover:text-red-500"
                  onClick={() => handleDelete(role.id)}
                />
              </div>
            </div>
          ))}

          {roles.length === 0 && (
            <p className="text-gray-400 text-sm mt-4">No roles created yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
