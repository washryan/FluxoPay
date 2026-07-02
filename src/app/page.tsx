import Link from "next/link";

const principles = [
  "Ambiente privado por usuário",
  "Registro rápido pelo Telegram",
  "Controle de contas e cartões",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,#bbf7d0,transparent_28%),radial-gradient(circle_at_82%_10%,#bae6fd,transparent_24%),linear-gradient(135deg,#f8fafc,#ecfeff_45%,#f7fee7)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
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
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/signup"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1fr_460px] lg:py-24">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex rounded-full border border-emerald-200 bg-white/70 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur">
              Produto real em fase inicial
            </div>
            <div className="space-y-6">
              <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Finanças pessoais para acompanhar o dinheiro sem complicação.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Um painel privado para organizar entradas, saídas, contas,
                cartões e, em seguida, registrar movimentações pelo Telegram
                usando linguagem natural.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full bg-emerald-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800"
                href="/signup"
              >
                Começar agora
              </Link>
              <Link
                className="rounded-full border border-slate-300 bg-white/70 px-6 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-white"
                href="/login"
              >
                Já tenho conta
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {principles.map((principle) => (
                <div
                  className="rounded-3xl border border-white/80 bg-white/70 p-4 text-sm font-medium leading-6 text-slate-700 shadow-sm backdrop-blur"
                  key={principle}
                >
                  {principle}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-950/20">
            <div className="rounded-[1.5rem] bg-white/[0.04] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Painel inicial
              </p>
              <div className="mt-6 grid gap-3">
                <div className="rounded-3xl bg-white p-5 text-slate-950">
                  <p className="text-sm text-slate-500">Saldo do mês</p>
                  <p className="mt-2 text-4xl font-semibold">R$ 0,00</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-emerald-400/15 p-4">
                    <p className="text-sm text-emerald-100">Entradas</p>
                    <p className="mt-2 text-2xl font-semibold">R$ 0</p>
                  </div>
                  <div className="rounded-3xl bg-orange-400/15 p-4">
                    <p className="text-sm text-orange-100">Saídas</p>
                    <p className="mt-2 text-2xl font-semibold">R$ 0</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
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
