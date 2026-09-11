"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
  Zap,
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
  {
    label: "Histórico",
    href: "/historico",
    icon: Activity,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-20 items-center border-b border-zinc-100 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950">
            <Zap className="h-5 w-5 text-white" />
          </div>

          <div>
            <p className="text-sm font-bold tracking-tight">
              DEV MANAGEMENT
            </p>

            <p className="text-[10px] uppercase tracking-widest text-zinc-400">
              Development BI
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5">

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

        <p className="mb-3 mt-8 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
          Sistema
        </p>

        <Link
          href="/configuracoes"
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
            pathname.startsWith("/configuracoes")
              ? "bg-zinc-950 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </Link>
      </nav>

      <div className="border-t border-zinc-100 p-4">
        <div className="rounded-xl bg-zinc-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              VO
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Victória</p>

              <p className="truncate text-xs text-zinc-400">
                Gestão de Projetos
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}





