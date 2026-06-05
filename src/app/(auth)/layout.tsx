export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_32%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_48%,#f7fee7_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_440px]">
        <section className="hidden space-y-8 md:block">
          <div className="inline-flex rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
            SaaS gratuito para finanças pessoais
          </div>
          <div className="max-w-2xl space-y-5">
            <h2 className="text-5xl font-semibold tracking-tight text-slate-950">
              Controle financeiro privado, limpo e preparado para bot.
            </h2>
            <p className="text-lg leading-8 text-slate-600">
              A base usa Supabase Auth, RLS por usuário e Next.js App Router para
              manter a separação entre UI, sessão e dados desde o primeiro dia.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {["RLS obrigatório", "Bot isolado", "Custo zero"].map((item) => (
              <div
                className="rounded-3xl border border-white/80 bg-white/70 p-4 text-sm font-semibold text-slate-700 shadow-sm"
                key={item}
              >
                {item}
              </div>
            ))}
          </div>
        </section>
        {children}
      </div>
    </main>
  );
}
