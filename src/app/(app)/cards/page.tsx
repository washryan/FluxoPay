import { BadgeCheck, CalendarDays, CreditCard, Landmark, Plus } from "lucide-react";

const cardPresets = [
  {
    name: "Nubank",
    shortName: "Nu",
    closingDay: 20,
    dueDay: 27,
    gradient: "from-violet-700 via-fuchsia-600 to-purple-500",
  },
  {
    name: "Caixa",
    shortName: "CX",
    closingDay: 18,
    dueDay: 25,
    gradient: "from-sky-700 via-blue-600 to-orange-400",
  },
  {
    name: "Inter",
    shortName: "IN",
    closingDay: 10,
    dueDay: 17,
    gradient: "from-orange-600 via-orange-500 to-amber-300",
  },
  {
    name: "Bradesco",
    shortName: "BR",
    closingDay: 12,
    dueDay: 20,
    gradient: "from-red-700 via-rose-600 to-pink-500",
  },
  {
    name: "Itaú",
    shortName: "IT",
    closingDay: 8,
    dueDay: 15,
    gradient: "from-orange-700 via-blue-700 to-indigo-600",
  },
  {
    name: "Santander",
    shortName: "ST",
    closingDay: 5,
    dueDay: 12,
    gradient: "from-red-700 via-red-500 to-orange-400",
  },
  {
    name: "Banco do Brasil",
    shortName: "BB",
    closingDay: 14,
    dueDay: 21,
    gradient: "from-yellow-400 via-blue-600 to-blue-800",
  },
  {
    name: "PicPay",
    shortName: "PP",
    closingDay: 22,
    dueDay: 1,
    gradient: "from-lime-500 via-green-500 to-emerald-700",
  },
];

export default function CardsPage() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Cartões de crédito
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Cadastre seus cartões principais.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Escolha um modelo conhecido para preencher rapidamente nome,
            fechamento e vencimento. Na próxima etapa, isso será conectado ao
            banco e às compras parceladas.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cardPresets.map((card) => (
            <article
              className={`interactive-card card-sheen animate-rise rounded-[1.75rem] bg-gradient-to-br ${card.gradient} p-5 text-white shadow-xl shadow-slate-950/10`}
              key={card.name}
            >
              <div className="relative z-10 flex min-h-44 flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-white/75">Modelo padrão</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                      {card.name}
                    </h2>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-white/18 text-sm font-black tracking-tight ring-1 ring-white/20">
                    {card.shortName}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white/85">
                    <CalendarDays className="size-4" />
                    Fecha dia {card.closingDay} · vence dia {card.dueDay}
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
                    <Plus className="size-4" />
                    Usar modelo
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-950 p-2 text-white">
                <CreditCard className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Cartão personalizado</h2>
                <p className="text-sm text-slate-500">
                  Para bancos digitais, cooperativas ou cartões de loja.
                </p>
              </div>
            </div>

            <form className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Nome do cartão
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Ex: Cartão da família"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Fechamento
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  max={31}
                  min={1}
                  placeholder="Dia"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Vencimento
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  max={31}
                  min={1}
                  placeholder="Dia"
                  type="number"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                Limite opcional
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  inputMode="decimal"
                  placeholder="Ex: 2500,00"
                />
              </label>
              <button
                className="h-11 w-fit rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white opacity-60"
                disabled
                type="button"
              >
                Salvar em breve
              </button>
            </form>
          </article>

          <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
              <BadgeCheck className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Próxima entrega</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              A Fase 3 vai salvar cartões no Supabase, gerar parcelas e montar a
              lógica de faturas com fechamento e vencimento.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Landmark className="size-4" />
                Preparado para bancos comuns
              </div>
              <p className="mt-2">
                Nubank, Caixa, Inter, Bradesco, Itaú, Santander, Banco do Brasil
                e PicPay já aparecem como modelos visuais.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
