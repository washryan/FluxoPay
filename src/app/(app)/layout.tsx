import { LogOut, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNavigation } from "@/components/app-navigation";
import { signOut } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";

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
    <div className="fluxopay-app min-h-screen bg-[#f4f6f5] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col lg:flex-row">
        <aside className="sticky top-0 z-40 shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[#143d30] text-white shadow-sm transition group-hover:bg-[#0f6148]">
                <WalletCards className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-bold tracking-[-0.01em] text-slate-950">
                  FluxoPay
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Finanças pessoais
                </span>
              </span>
            </Link>
            <form action={signOut} className="lg:hidden">
              <button aria-label="Sair" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>

          <AppNavigation />

          <div className="mt-auto hidden pt-6 lg:block">
            <div className="border-t border-slate-200 pt-5">
              <p className="text-xs font-medium text-slate-500">
                Logado como
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <form action={signOut} className="mt-4">
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <LogOut className="size-4" />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-x-hidden bg-[#f4f6f5] text-slate-950">
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
