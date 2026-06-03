import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const sidebarItems = [
  {
    name: "Dashboard",
    icon: "LayoutDashboard",
    path: "/dashboard",
  },
  {
    name: "Requests",
    icon: "FileText",
    path: "/requests",
  },
  {
    name: "Shortlists",
    icon: "ListCheck",
    path: "/shortlists",
  },
  {
    name: "Billing",
    icon: "CreditCard",
    path: "/billing",
  },
];

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left sidebar */}
      <Sidebar title="" items={sidebarItems} />

      {/* Main area including header and page content */}
      <div className="flex-1">
        <Header />
        <main className="ml-64 mt-24 p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
