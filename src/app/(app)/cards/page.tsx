import { BadgeCheck, Landmark, Trash2 } from "lucide-react";

import { createCreditCard, deleteCreditCard } from "@/features/cards/actions";
import { CustomCardForm } from "@/features/cards/card-form";
import { getCreditCards } from "@/features/cards/data";
import { cardPresets, getCardPreset } from "@/features/cards/presets";
import { formatCurrencyFromCents } from "@/lib/formatters";

type CardsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const [params, cardsResult] = await Promise.all([
    searchParams,
    getCreditCards(),
  ]);

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
            Escolha um modelo conhecido ou crie um cartão personalizado. Os
            cartões já são salvos no Supabase e serão usados para compras
            parceladas na próxima etapa.
          </p>
        </header>

        {params.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.success}
          </div>
        ) : null}

        {params.error ?? cardsResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error ?? "Não foi possível carregar cartões."}
          </div>
        ) : null}

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
                  <p className="text-sm text-white/85">
                    Fecha dia {card.closingDay} · vence dia {card.dueDay}
                  </p>
                  <form action={createCreditCard}>
                    <input name="name" type="hidden" value={card.name} />
                    <input
                      name="closing_day"
                      type="hidden"
                      value={card.closingDay}
                    />
                    <input name="due_day" type="hidden" value={card.dueDay} />
                    <input name="limit" type="hidden" value="" />
                    <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]">
                      Usar modelo
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Cartões cadastrados</h2>
            <p className="mt-1 text-sm text-slate-500">
              {cardsResult.cards.length} cartões salvos.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {cardsResult.cards.length > 0 ? (
                cardsResult.cards.map((card) => {
                  const preset = getCardPreset(card.name);

                  return (
                    <div
                      className={`rounded-[1.5rem] border border-slate-200 p-4 ${
                        preset
                          ? `bg-gradient-to-br ${preset.gradient} text-white`
                          : "bg-slate-950 text-white"
                      }`}
                      key={card.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm opacity-75">Cartão</p>
                          <h3 className="mt-1 text-xl font-semibold">
                            {card.name}
                          </h3>
                        </div>
                        <div className="grid size-10 place-items-center rounded-2xl bg-white/18 text-xs font-black ring-1 ring-white/20">
                          {preset?.shortName ?? card.name.slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="mt-6 grid gap-2 text-sm opacity-90">
                        <p>
                          Fecha dia {card.closing_day} · vence dia {card.due_day}
                        </p>
                        <p>
                          Limite:{" "}
                          {card.limit_cents
                            ? formatCurrencyFromCents(card.limit_cents)
                            : "não informado"}
                        </p>
                      </div>
                      <form action={deleteCreditCard} className="mt-4">
                        <input name="id" type="hidden" value={card.id} />
                        <button className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-white">
                          <Trash2 className="size-3.5" />
                          Excluir
                        </button>
                      </form>
                    </div>
                  );
                })
              ) : (
                <div className="grid min-h-52 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 md:col-span-2">
                  Nenhum cartão cadastrado ainda.
                </div>
              )}
            </div>
          </article>

          <div className="space-y-5">
            <CustomCardForm />
            <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
              <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                <BadgeCheck className="size-5" />
              </span>
              <h2 className="mt-4 text-lg font-semibold">Próxima entrega</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                A próxima parte da Fase 3 conecta compras de cartão, parcelas e
                faturas calculadas por fechamento e vencimento.
              </p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Landmark className="size-4" />
                  Persistência ativa
                </div>
                <p className="mt-2">
                  Os cartões salvos já ficam isolados por usuário via RLS.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
