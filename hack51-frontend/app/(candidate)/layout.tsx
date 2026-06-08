import LayoutShell from "@/app/components/LayoutShell";

const sidebarItems = [
  {
    name: "Dashboard",
    icon: "LayoutDashboard",
    path: "/candidate/dashboard",
  },
  {
    name: "Challenges",
    icon: "Zap",
    path: "/candidate/challenges",
  },
  {
    name: "Submissions",
    icon: "ClipboardList",
    path: "/candidate/submissions",
  },
  {
    name: "Profile",
    icon: "User",
    path: "/candidate/profile",
  },
];

export default function CandidateLayout({
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
