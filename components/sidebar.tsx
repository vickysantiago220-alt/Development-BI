"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ClickUpSync from "@/components/clickup-sync";

import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Projetos",
    href: "/projetos",
    icon: FolderKanban,
  },
  {
    label: "Demandas",
    href: "/demandas",
    icon: ListTodo,
  },
  {
    label: "Equipe",
    href: "/equipe",
    icon: Users,
  },
  {
    label: "Alocação",
    href: "/alocacao",
    icon: BarChart3,
  },
  {
    label: "Planejamento",
    href: "/planejamento",
    icon: ClipboardList,
  },
  {
    label: "Roadmap",
    href: "/roadmap",
    icon: CalendarDays,
  },
  /*
  {
    label: "Histórico",
    href: "/historico",
    icon: Activity,
  },
  */
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center border-b border-zinc-100 px-6">
        <div className="flex items-center">
          <img
            src="/dev-management-logo-color.svg"
            alt="DEV MANAGEMENT"
            className="h-20 w-auto"
          />
        </div>
      </div>

      <nav className="px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Gestão
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

      </nav>

      <div className="px-4 pb-4">
        <ClickUpSync />
      </div>

    </aside>
  );
}








