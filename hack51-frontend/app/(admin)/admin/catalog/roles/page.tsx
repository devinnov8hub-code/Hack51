import React from "react";
import RoleCreation from "../../components/RoleCreation";

const page = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold">Catalog</h1>
      <p className="text-sm text-gray-400 mt-0.5 mb-6">
        Manage roles and challenges
      </p>
      <RoleCreation />
    </div>
  );
};

export default page;
