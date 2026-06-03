import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const sidebarItems = [
  {
    name: "Dashboard",
    icon: "LayoutDashboard",
    path: "/admin/dashboard",
  },
    {
    name: "Catalog",
    icon: "BookOpen",
    path: "/admin/catalog/roles",
  },
  {
    name: "Review",
    icon: "FileText",
    path: "/admin/review",
  },
    {
    name: "Shortlist",
    icon: "ListCheck",
    path: "/admin/shortlists",
  },
  {
    name: "Wallet",
    icon: "Wallet",
    path: "/admin/wallet",
  },
];

export default function AdminLayout({
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
        <Header
          // logo="/logo.png"
          // first_name="Admin"
          // last_name="User"
          // usermode="Admin"
          // avatar="/icons/avatardefault.webp"
        />
        <main className="ml-64 mt-24 p-6 bg-gray-50 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
