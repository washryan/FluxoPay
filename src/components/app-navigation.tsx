"use client";

import {
  BarChart3,
  Bot,
  CalendarClock,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Visão geral" },
  { href: "/resumo", icon: BarChart3, label: "Resumo" },
  { href: "/vencimentos", icon: CalendarClock, label: "Vencimentos" },
  { href: "/transactions", icon: ListChecks, label: "Transações" },
  { href: "/bills", icon: ReceiptText, label: "Contas" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/categories", icon: Tags, label: "Categorias" },
  { href: "/settings/telegram", icon: Bot, label: "Telegram" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="mt-4 flex gap-1 overflow-x-auto pb-1 lg:mt-8 lg:grid lg:overflow-visible lg:pb-0"
    >
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group inline-flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive
                ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon
              className={cn(
                "size-4 transition",
                isActive
                  ? "text-emerald-700"
                  : "text-slate-400 group-hover:text-slate-600",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
