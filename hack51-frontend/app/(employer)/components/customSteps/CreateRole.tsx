"use client";

import { useState } from "react";

interface RoleProps {
  roles?: string[];
  onChange?: (role: string) => void;
}

const defaultRoles = ["Software Engineer", "Product Manager", "Designer"];

export default function CreateRole() {
//   const [selectedRole, setSelectedRole] = useState<string>("");

//   const handleRoleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const role = event.target.value;
//     setSelectedRole(role);
//     onChange?.(role);
//   };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full mt-8 md:w-3/4 mx-auto">
      <h2 className="border-b border-b-gray-300 text-xl">
        Role Name
      </h2>
      
        <div
          
          className="p-4 mt-4 gap-4 cursor-pointer flex items-center"
        >
          <input
            type="text"
            name="role"
            // value={role}
            // checked={selectedRole === role}
            // onChange={handleRoleChange}
            placeholder="Enter role name"
            className="rounded-lg p-2 w-full border border-gray-300 focus:ring-1   "
          />
          <label htmlFor="role" className="ml-3">
            {/* {role} */}
          </label>
        </div>
   
    </div>
  );
}
