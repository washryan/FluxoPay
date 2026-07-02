import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bot,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  ReceiptText,
  Tags,
} from "lucide-react";

import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/resumo", icon: BarChart3, label: "Resumo" },
  { href: "/transactions", icon: ListChecks, label: "Transações" },
  { href: "/categories", icon: Tags, label: "Categorias" },
  { href: "/bills", icon: ReceiptText, label: "Contas" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/settings/telegram", icon: Bot, label: "Telegram" },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name ||
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    user.email?.split("@")[0] ||
    "Usuário";

  return (
    <div className="min-h-screen bg-[#050914] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-white/10 bg-[#050914]/95 p-4 backdrop-blur lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r lg:p-5">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-[1.35rem] bg-[linear-gradient(135deg,#052e2b,#10b981_52%,#d9f99d)] text-lg font-black text-white shadow-lg shadow-emerald-950/40 ring-1 ring-white/15 transition group-hover:scale-105">
                F
              </span>
              <span>
                <span className="block text-sm font-black uppercase tracking-[0.26em] text-emerald-300">
                  FluxoPay
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  Controle financeiro real
                </span>
              </span>
            </Link>
            <form action={signOut} className="lg:hidden">
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
                Sair
              </button>
            </form>
          </div>

          <div className="mt-5 hidden rounded-[1.5rem] border border-emerald-300/15 bg-emerald-300/[0.06] p-4 text-sm text-emerald-50 lg:block">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-2xl bg-emerald-300/15 text-emerald-200">
                <FolderKanban className="size-4" />
              </span>
              <div>
                <p className="font-semibold">Workspace privado</p>
                <p className="text-xs text-emerald-100/65">
                  Supabase + bot local
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:grid lg:overflow-visible lg:pb-0">
            {navigation.map((item) => (
              <Link
                className="group inline-flex min-h-11 items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                href={item.href}
                key={item.href}
              >
                <item.icon className="size-4 text-slate-500 transition group-hover:text-emerald-300" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto hidden pt-6 lg:block">
            <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Logado como
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {displayName}
              </p>
              <form action={signOut} className="mt-4">
                <button className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-100">
                  Sair
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="app-orb relative min-w-0 flex-1 overflow-x-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#edf4f7_45%,#eaf2ee_100%)] text-slate-950 lg:rounded-l-[2.5rem]">
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
