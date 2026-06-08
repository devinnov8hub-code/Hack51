import LayoutShell from "@/app/components/LayoutShell";

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
    <LayoutShell sidebarTitle="" sidebarItems={sidebarItems}>
      {children}
    </LayoutShell>
  );
}
