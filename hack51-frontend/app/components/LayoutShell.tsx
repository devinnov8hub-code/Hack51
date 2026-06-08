"use client";
import { useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

type LayoutShellProps = {
  sidebarTitle: string;
  sidebarItems: { name: string; icon?: string; path: string }[];
  children: React.ReactNode;
};

export default function LayoutShell({
  sidebarTitle,
  sidebarItems,
  children,
}: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        title={sidebarTitle}
        items={sidebarItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="md:ml-64 mt-24 p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
