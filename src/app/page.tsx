import Link from "next/link";

const principles = [
  "Ambiente privado por usuário",
  "Registro rápido pelo Telegram",
  "Controle de contas e cartões",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f6f5]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            FluxoPay
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              href="/login"
            >
              Entrar
            </Link>
            <Link
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              href="/signup"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_460px] lg:py-24">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
              Clareza para suas finanças
            </div>
            <div className="space-y-6">
              <h1 className="text-5xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
                Finanças pessoais para acompanhar o dinheiro sem complicação.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Um painel privado para organizar entradas, saídas, contas,
                cartões e movimentações pelo Telegram usando linguagem natural.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-xl bg-emerald-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                href="/signup"
              >
                Começar agora
              </Link>
              <Link
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                href="/login"
              >
                Já tenho conta
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {principles.map((principle) => (
                <div
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-700"
                  key={principle}
                >
                  {principle}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#20382f] bg-[#10231c] p-5 text-white shadow-[0_16px_42px_rgb(15_35_28/0.14)]">
            <div className="rounded-[1.25rem] bg-white/[0.04] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Painel inicial
              </p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl bg-white p-5 text-slate-950">
                  <p className="text-sm text-slate-500">Saldo do mês</p>
                  <p className="financial-value mt-2 text-4xl font-semibold">R$ 0,00</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-emerald-400/15 p-4">
                    <p className="text-sm text-emerald-100">Entradas</p>
                    <p className="mt-2 text-2xl font-semibold">R$ 0</p>
                  </div>
                  <div className="rounded-2xl bg-orange-400/15 p-4">
                    <p className="text-sm text-orange-100">Saídas</p>
                    <p className="mt-2 text-2xl font-semibold">R$ 0</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
                  Telegram: gastei 18 no lanche vira uma confirmação antes
                  de entrar no seu histórico.
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
