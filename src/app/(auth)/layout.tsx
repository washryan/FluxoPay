export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-8 sm:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-10 md:grid-cols-[1fr_440px]">
        <section className="hidden space-y-8 md:block">
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
            Seu dinheiro, com clareza
          </div>
          <div className="max-w-2xl space-y-5">
            <h2 className="text-5xl font-semibold tracking-[-0.05em] text-slate-950">
              Uma visão tranquila da sua vida financeira.
            </h2>
            <p className="text-lg leading-8 text-slate-600">
              Acompanhe saldo, entradas, saídas, contas e cartões em um só
              lugar — também pelo Telegram quando preferir.
            </p>
          </div>
          <div className="grid max-w-xl grid-cols-3 gap-3">
            {["Dados privados", "Bot com confirmação", "Uso diário"].map((item) => (
              <div
                className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700"
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
