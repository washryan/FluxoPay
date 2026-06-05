import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transações" },
  { href: "/categories", label: "Categorias" },
  { href: "/bills", label: "Contas" },
  { href: "/cards", label: "Cartões" },
  { href: "/settings/telegram", label: "Telegram" },
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-white/10 bg-slate-950/80 p-4 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
          <div className="flex items-center justify-between gap-4 lg:block">
            <Link href="/dashboard" className="block">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                FluxoPay
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Workspace financeiro privado
              </p>
            </Link>
            <form action={signOut} className="lg:hidden">
              <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">
                Sair
              </button>
            </form>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto lg:grid lg:overflow-visible">
            {navigation.map((item) => (
              <Link
                className="whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 hidden rounded-3xl border border-white/10 bg-white/[0.03] p-4 lg:block">
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <form action={signOut} className="mt-4">
              <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-100">
                Sair
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50 text-slate-950 lg:rounded-l-[2rem]">
          {children}
        </main>
      </div>
    </div>
  );
}
