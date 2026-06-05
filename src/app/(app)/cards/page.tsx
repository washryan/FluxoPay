import { BadgeCheck, Landmark, ReceiptText, Trash2 } from "lucide-react";

import {
  createCreditCard,
  createCreditCardPurchase,
  deleteCreditCard,
  deleteCreditCardPurchase,
} from "@/features/cards/actions";
import { CustomCardForm } from "@/features/cards/card-form";
import {
  getCreditCardPurchases,
  getCreditCards,
  getUpcomingInstallments,
} from "@/features/cards/data";
import { PresetCardPicker } from "@/features/cards/preset-card-picker";
import { getCardPreset } from "@/features/cards/presets";
import { CreditCardPurchaseForm } from "@/features/cards/purchase-form";
import { billStatusLabels, billStatusStyles } from "@/features/bills/constants";
import { getCategories } from "@/features/categories/data";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

type CardsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const [
    params,
    cardsResult,
    categoriesResult,
    purchasesResult,
    installmentsResult,
  ] = await Promise.all([
    searchParams,
    getCreditCards(),
    getCategories(),
    getCreditCardPurchases(),
    getUpcomingInstallments(),
  ]);
  const pageError =
    params.error ??
    cardsResult.error ??
    categoriesResult.error ??
    purchasesResult.error ??
    installmentsResult.error;

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
            Escolha um modelo conhecido, configure datas reais de fatura e
            registre compras parceladas com geração automática de parcelas.
          </p>
        </header>

        {params.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.success}
          </div>
        ) : null}

        {pageError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <PresetCardPicker action={createCreditCard} />

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
              <h2 className="mt-4 text-lg font-semibold">Persistência ativa</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Cartões, compras e parcelas ficam isolados por usuário via RLS.
                O cadastro usa centavos para evitar erro de ponto flutuante.
              </p>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Landmark className="size-4" />
                  Plano gratuito
                </div>
                <p className="mt-2">
                  Para 3 pessoas, estes registros ocupam pouquíssimo espaço no
                  Supabase.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
          <CreditCardPurchaseForm
            action={createCreditCardPurchase}
            cards={cardsResult.cards}
            categories={categoriesResult.categories}
          />

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Próximas parcelas</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Parcelas pendentes ordenadas pelo vencimento.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {installmentsResult.installments.length} próximas
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {installmentsResult.installments.length > 0 ? (
                installmentsResult.installments.map((installment) => (
                  <div
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center"
                    key={installment.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                          {installment.purchase_description}
                        </h3>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            billStatusStyles[installment.status]
                          }`}
                        >
                          {billStatusLabels[installment.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {installment.card_name} · parcela{" "}
                        {installment.installment_number}/
                        {installment.installments_count} · vence{" "}
                        {formatDate(installment.due_date)}
                      </p>
                    </div>
                    <strong className="text-lg text-slate-950">
                      {formatCurrencyFromCents(installment.amount_cents)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="grid min-h-44 place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhuma parcela pendente por enquanto.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Compras recentes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimas compras lançadas em cartões de crédito.
              </p>
            </div>
            <ReceiptText className="size-5 text-slate-400" />
          </div>

          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            {purchasesResult.purchases.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {purchasesResult.purchases.map((purchase) => (
                  <div
                    className="grid gap-3 bg-white p-4 transition hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center"
                    key={purchase.id}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">
                          {purchase.description}
                        </h3>
                        {purchase.category_name ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {purchase.category_name}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {purchase.card_name} · {purchase.installments_count}x ·{" "}
                        {formatDate(purchase.purchase_date)}
                      </p>
                    </div>

                    <strong className="text-lg text-slate-950">
                      {formatCurrencyFromCents(purchase.total_amount_cents)}
                    </strong>

                    <form action={deleteCreditCardPurchase}>
                      <input name="id" type="hidden" value={purchase.id} />
                      <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                        <Trash2 className="size-3.5" />
                        Excluir
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-44 place-items-center bg-slate-50 p-6 text-center text-sm text-slate-500">
                Nenhuma compra no cartão registrada ainda.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
