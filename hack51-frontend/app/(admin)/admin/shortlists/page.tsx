"use client";

import { Suspense } from "react";
import ShortlistsTable from "../components/ShortlistsTable";

export default function Shortlists() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <div className="loader" />
        </div>
      }
    >
      <ShortlistsTable />
    </Suspense>
  );
}
