import LayoutShell from "@/app/components/LayoutShell";

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
    <LayoutShell sidebarTitle="" sidebarItems={sidebarItems}>
      {children}
    </LayoutShell>
  );
}
