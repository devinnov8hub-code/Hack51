"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  FileText,
  ListCheck,
  CreditCard,
  BookOpen,
  Settings,
  Zap,
  ClipboardList,
  User,
  LayoutDashboard,
  Wallet,
  X,
} from "lucide-react";

type SidebarProps = {
  title: string;
  items: { name: string; icon?: string; path: string }[];
  isOpen?: boolean;
  onClose?: () => void;
};

const iconMap: Record<
  string,
  React.ComponentType<{ size: number; className?: string }>
> = {
  FileText,
  ListCheck,
  CreditCard,
  BookOpen,
  Settings,
  Zap,
  ClipboardList,
  User,
  LayoutDashboard,
  Wallet,
};

export default function Sidebar({ title, items, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 pt-16 z-20 transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Close button on mobile only */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:hidden text-gray-500 hover:text-gray-800"
        aria-label="Close sidebar"
      >
        <X size={20} />
      </button>

      <div className="text-2xl font-bold p-4">{title}</div>
      <nav className="flex flex-col gap-2 p-4">
        {items.map((item, index) => {
          const isActive = pathname === item.path;
          const isSvgPath = item.icon?.startsWith("/");
          const IconComponent =
            !isSvgPath && item.icon ? iconMap[item.icon] : null;

          return (
            <Link
              key={index}
              href={item.path}
              onClick={onClose}
              className={`block p-2 font-semibold rounded-lg hover:bg-gray-100 text-gray-800 hover:text-gray-900 flex items-center gap-2 ${
                isActive
                  ? "bg-[#FF0046] text-white hover:bg-red-700 hover:text-white"
                  : "bg-white"
              }`}
            >
              {item.icon && (
                <>
                  {isSvgPath ? (
                    <Image
                      src={item.icon}
                      alt={`${item.name} icon`}
                      width={20}
                      height={20}
                      className="w-5 h-5"
                    />
                  ) : IconComponent ? (
                    <IconComponent size={20} className="w-5 h-5" />
                  ) : null}
                </>
              )}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* logout */}
      <div className="absolute bottom-0 left-0 w-full p-4">
        <Link
          href="/auth/logout"
          onClick={onClose}
          className="p-2 text-red-500 font-bold bg-white hover:bg-red-600 hover:text-white rounded flex items-center gap-2"
        >
          <LogOut className="inline-block w-5 h-5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
