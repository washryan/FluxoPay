import {
  BadgeCheck,
  CalendarCheck2,
  CreditCard,
  Search,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import {
  EmptyState,
  PageFrame,
  PageHero,
  SoftBadge,
  Surface,
} from "@/components/app-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { SubmitButton } from "@/components/submit-button";
import {
  adjustCreditCardPurchaseInstallments,
  createCreditCard,
  createCreditCardPurchase,
  deleteCreditCard,
  deleteCreditCardPurchase,
  markInstallmentAsPaid,
  markInvoiceAsPaid,
  moveInstallmentInvoice,
  revokeInvoicePayment,
  updateCreditCard,
} from "@/features/cards/actions";
import { CustomCardForm } from "@/features/cards/card-form";
import {
  getCreditCardInvoices,
  getCreditCards,
  getUpcomingInstallments,
} from "@/features/cards/data";
import { PresetCardPicker } from "@/features/cards/preset-card-picker";
import { getCardPreset } from "@/features/cards/presets";
import { CreditCardPurchaseForm } from "@/features/cards/purchase-form";
import { InvoicePaymentDialog } from "@/features/cards/invoice-payment-dialog";
import { billStatusLabels, billStatusStyles } from "@/features/bills/constants";
import { getCategories } from "@/features/categories/data";
import { syncOverdueStatuses } from "@/features/overdue/sync";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

type CardsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
    invoiceStatus?: string;
    q?: string;
  }>;
};

function formatInvoiceMonth(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function filterHref({
  invoiceStatus,
  q,
}: {
  invoiceStatus?: string;
  q?: string;
}) {
  const query = new URLSearchParams();

  if (invoiceStatus && invoiceStatus !== "all") {
    query.set("invoiceStatus", invoiceStatus);
  }

  if (q) {
    query.set("q", q);
  }

  const value = query.toString();
  return value ? `/cards?${value}` : "/cards";
}

function CardsReturnState({
  invoiceSearch,
  invoiceStatus,
}: {
  invoiceSearch: string;
  invoiceStatus: string;
}) {
  return (
    <>
      <input name="cards_return_anchor" type="hidden" value="faturas" />
      <input name="cards_invoice_status" type="hidden" value={invoiceStatus} />
      <input name="cards_invoice_search" type="hidden" value={invoiceSearch} />
    </>
  );
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  await syncOverdueStatuses();

  const [
    params,
    cardsResult,
    categoriesResult,
    installmentsResult,
    invoicesResult,
  ] = await Promise.all([
    searchParams,
    getCreditCards(),
    getCategories(),
    getUpcomingInstallments(),
    getCreditCardInvoices(),
  ]);
  const activeInvoiceStatus =
    params.invoiceStatus === "paid" ||
    params.invoiceStatus === "open" ||
    params.invoiceStatus === "overdue"
      ? params.invoiceStatus
      : "all";
  const invoiceSearch = (params.q ?? "").trim();
  const normalizedInvoiceSearch = invoiceSearch
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const filteredInvoices = invoicesResult.invoices.filter((invoice) => {
    if (activeInvoiceStatus === "paid" && invoice.status !== "paid") {
      return false;
    }

    if (activeInvoiceStatus === "open" && invoice.status !== "pending") {
      return false;
    }

    if (activeInvoiceStatus === "overdue" && invoice.status !== "overdue") {
      return false;
    }

    if (!normalizedInvoiceSearch) {
      return true;
    }

    const searchable = [
      invoice.card_name,
      invoice.invoice_month,
      ...invoice.items.map((item) => item.purchase_description),
      ...invoice.items.map((item) => item.category_name ?? ""),
    ]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    return searchable.includes(normalizedInvoiceSearch);
  });
  const pageError =
    params.error ??
    cardsResult.error ??
    categoriesResult.error ??
    installmentsResult.error ??
    invoicesResult.error;
  const cardsReturnState = {
    invoiceSearch,
    invoiceStatus: activeInvoiceStatus,
  };
  const openInvoices = invoicesResult.invoices.filter(
    (invoice) => invoice.status !== "paid" && invoice.open_cents > 0,
  );
  const totalOpenInvoicesCents = openInvoices.reduce(
    (total, invoice) => total + invoice.open_cents,
    0,
  );
  const overdueInvoicesCount = invoicesResult.invoices.filter(
    (invoice) => invoice.status === "overdue",
  ).length;
  const totalAvailableCents = cardsResult.cards.reduce((total, card) => {
    if (card.available_cents === null) {
      return total;
    }

    return total + Math.max(0, card.available_cents);
  }, 0);

  return (
    <PageFrame>
      <PageHero
        actions={
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-100"
            href="#faturas"
          >
            Ver faturas
          </Link>
        }
        description="Controle limite disponível, compras parceladas, faturas abertas, pagamentos parciais e parcelamentos sem perder o rastro."
        eyebrow="Cartões de crédito"
        title="Faturas complexas, leitura simples."
        variant="dark"
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Em aberto
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrencyFromCents(totalOpenInvoicesCents)}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Faturas atrasadas
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-100">
              {overdueInvoicesCount}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Cartões ativos
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {cardsResult.cards.length}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Limite disponível
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrencyFromCents(totalAvailableCents)}
            </p>
          </div>
        </div>
      </PageHero>

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

      <Surface
        action={
          <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
            <Sparkles className="size-5" />
          </span>
        }
        title="Modelos rápidos"
        description="Comece por um banco conhecido e ajuste fechamento, vencimento e limite antes de salvar."
      >
        <PresetCardPicker action={createCreditCard} />
      </Surface>

      <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <Surface
          title="Cartões cadastrados"
          description={`${cardsResult.cards.length} cartões salvos com limite, fechamento e vencimento.`}
          action={
            <span className="rounded-2xl bg-slate-950 p-2 text-white">
              <WalletCards className="size-5" />
            </span>
          }
        >
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
                        {preset?.shortName ??
                          card.name.slice(0, 2).toUpperCase()}
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
                      <p>
                        Em aberto: {formatCurrencyFromCents(card.open_cents)}
                      </p>
                      <p>
                        Disponível:{" "}
                        {card.available_cents === null
                          ? "sem limite informado"
                          : formatCurrencyFromCents(card.available_cents)}
                      </p>
                    </div>
                    {card.limit_cents ? (
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
                        <div
                          className="h-full rounded-full bg-white/90"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (card.open_cents / card.limit_cents) * 100,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    ) : null}
                    <details className="mt-4 rounded-2xl bg-white/12 p-3 text-sm ring-1 ring-white/15">
                      <summary className="cursor-pointer font-semibold">
                        Editar cartão
                      </summary>
                      <form
                        action={updateCreditCard}
                        className="mt-3 grid gap-3 text-slate-950"
                      >
                        <input name="id" type="hidden" value={card.id} />
                        <label className="grid gap-1 text-xs font-semibold text-white/85">
                          Nome
                          <input
                            className="h-10 rounded-2xl border border-white/20 bg-white px-3 text-sm text-slate-950 outline-none"
                            name="name"
                            required
                            defaultValue={card.name}
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="grid gap-1 text-xs font-semibold text-white/85">
                            Fechamento
                            <input
                              className="h-10 rounded-2xl border border-white/20 bg-white px-3 text-sm text-slate-950 outline-none"
                              max={31}
                              min={1}
                              name="closing_day"
                              required
                              type="number"
                              defaultValue={card.closing_day}
                            />
                          </label>
                          <label className="grid gap-1 text-xs font-semibold text-white/85">
                            Vencimento
                            <input
                              className="h-10 rounded-2xl border border-white/20 bg-white px-3 text-sm text-slate-950 outline-none"
                              max={31}
                              min={1}
                              name="due_day"
                              required
                              type="number"
                              defaultValue={card.due_day}
                            />
                          </label>
                        </div>
                        <label className="grid gap-1 text-xs font-semibold text-white/85">
                          Limite
                          <input
                            className="h-10 rounded-2xl border border-white/20 bg-white px-3 text-sm text-slate-950 outline-none"
                            inputMode="decimal"
                            name="limit"
                            placeholder="Sem limite"
                            defaultValue={
                              card.limit_cents
                                ? (card.limit_cents / 100)
                                    .toFixed(2)
                                    .replace(".", ",")
                                : ""
                            }
                          />
                        </label>
                        <SubmitButton
                          className="h-10 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-100"
                          pendingLabel="Salvando..."
                        >
                          Salvar edição
                        </SubmitButton>
                      </form>
                    </details>
                    <form action={deleteCreditCard} className="mt-4">
                      <input name="id" type="hidden" value={card.id} />
                      <ConfirmButton
                        className="inline-flex items-center gap-2 bg-white/95 text-slate-950 hover:bg-white"
                        message={`Excluir o cartão ${card.name}? As compras e parcelas dele também serão removidas.`}
                        pendingLabel="Excluindo..."
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </ConfirmButton>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="md:col-span-2">
                <EmptyState
                  description="Cadastre um cartão padrão ou personalizado para começar a gerar faturas."
                  icon={CreditCard}
                  title="Nenhum cartão cadastrado"
                />
              </div>
            )}
          </div>
        </Surface>

        <div className="space-y-5">
          <CustomCardForm />
          <Surface>
            <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
              <BadgeCheck className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Tudo organizado</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Acompanhe compras parceladas, vencimentos e faturas em um só
              lugar, sem perder o histórico do que já foi pago.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <BadgeCheck className="size-4" />
                Pronto para o dia a dia
              </div>
              <p className="mt-2">
                Use esta tela para lançar compras no cartão e conferir as
                próximas parcelas antes do vencimento.
              </p>
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[430px_1fr]">
        <CreditCardPurchaseForm
          action={createCreditCardPurchase}
          cards={cardsResult.cards}
          categories={categoriesResult.categories}
          returnState={cardsReturnState}
        />

        <Surface
          title="Próximas parcelas"
          description="Parcelas pendentes ordenadas pelo vencimento."
          action={
            <SoftBadge className="border-slate-200 bg-slate-100 text-slate-600">
              {installmentsResult.installments.length} próximas
            </SoftBadge>
          }
        >
          <div className="mt-5 grid gap-3">
            {installmentsResult.installments.length > 0 ? (
              installmentsResult.installments.map((installment) => (
                <div
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto_auto] md:items-center"
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
                  {installment.status !== "paid" &&
                  installment.status !== "cancelled" ? (
                    <form action={markInstallmentAsPaid}>
                      <input name="id" type="hidden" value={installment.id} />
                      <ConfirmButton
                        className="h-9 bg-emerald-600 text-white hover:bg-emerald-700"
                        message={`Marcar a parcela de ${formatCurrencyFromCents(installment.amount_cents)} como paga?`}
                        pendingLabel="Pagando..."
                      >
                        Marcar como paga
                      </ConfirmButton>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                description="Quando houver compras parceladas em aberto, elas aparecem nesta fila."
                icon={CalendarCheck2}
                title="Nenhuma parcela pendente"
              />
            )}
          </div>
        </Surface>
      </section>

      <Surface
        action={<CalendarCheck2 className="size-5 text-emerald-600" />}
        className="scroll-mt-6"
        description="Agrupadas por cartão e mês de vencimento, com ações de pagamento."
        id="faturas"
        title="Faturas consolidadas"
      >
        <div className="mt-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/90 p-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Todas", value: "all" },
              { label: "Em aberto", value: "open" },
              { label: "Pagas", value: "paid" },
              { label: "Atrasadas", value: "overdue" },
            ].map((option) => (
              <Link
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  activeInvoiceStatus === option.value
                    ? "bg-slate-950 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                href={filterHref({
                  invoiceStatus: option.value,
                  q: invoiceSearch,
                })}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>

          <form action="/cards" className="flex flex-col gap-2 sm:flex-row">
            {activeInvoiceStatus !== "all" ? (
              <input
                name="invoiceStatus"
                type="hidden"
                value={activeInvoiceStatus}
              />
            ) : null}
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 min-w-0 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-80"
                name="q"
                placeholder="Buscar por cartão, compra ou categoria"
                defaultValue={invoiceSearch}
              />
            </label>
            <button className="h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
              Buscar
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-4">
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => (
              <article
                className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50"
                key={invoice.key}
              >
                {/*
                    A fatura pode estar paga com valor menor que o total quando
                    o restante foi carregado para o mês seguinte.
                  */}
                {(() => {
                  const transferredCents =
                    invoice.status === "paid" &&
                    invoice.paid_cents < invoice.total_cents
                      ? invoice.total_cents - invoice.paid_cents
                      : 0;

                  return (
                    <>
                      <div className="grid gap-4 bg-white p-4 md:grid-cols-[1fr_auto] md:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-slate-950">
                              {invoice.card_name}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                billStatusStyles[invoice.status]
                              }`}
                            >
                              {billStatusLabels[invoice.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatInvoiceMonth(invoice.invoice_month)} ·
                            vencimento {formatDate(invoice.due_date)}
                          </p>
                        </div>

                        <div className="grid gap-3 text-left md:text-right">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              Em aberto
                            </p>
                            <p className="text-2xl font-semibold text-slate-950">
                              {formatCurrencyFromCents(invoice.open_cents)}
                            </p>
                          </div>
                          {invoice.open_cents > 0 ? (
                            <InvoicePaymentDialog
                              action={markInvoiceAsPaid}
                              cards={cardsResult.cards}
                              invoice={invoice}
                              returnState={cardsReturnState}
                            />
                          ) : invoice.payment_transaction_id ? (
                            <form action={revokeInvoicePayment}>
                              <CardsReturnState {...cardsReturnState} />
                              <input
                                name="transaction_id"
                                type="hidden"
                                value={invoice.payment_transaction_id}
                              />
                              <ConfirmButton
                                className="h-10 px-4 text-sm"
                                message={`Revogar o pagamento da fatura de ${invoice.card_name}? A transação será excluída e as parcelas voltarão para em aberto ou atrasadas.`}
                                pendingLabel="Revogando..."
                                variant="danger"
                              >
                                Revogar pagamento
                              </ConfirmButton>
                            </form>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={`grid gap-3 border-t border-slate-200 p-4 ${
                          invoice.interest_cents > 0 || transferredCents > 0
                            ? "md:grid-cols-4"
                            : "md:grid-cols-3"
                        }`}
                      >
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">
                            Total da fatura
                          </p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {formatCurrencyFromCents(invoice.total_cents)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Pago</p>
                          <p className="mt-1 font-semibold text-emerald-700">
                            {formatCurrencyFromCents(invoice.paid_cents)}
                          </p>
                        </div>
                        {invoice.interest_cents > 0 ? (
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs text-slate-500">
                              Juros/taxas
                            </p>
                            <p className="mt-1 font-semibold text-orange-700">
                              {formatCurrencyFromCents(invoice.interest_cents)}
                            </p>
                          </div>
                        ) : null}
                        {transferredCents > 0 ? (
                          <div className="rounded-2xl bg-white p-3">
                            <p className="text-xs text-slate-500">
                              Transferido
                            </p>
                            <p className="mt-1 font-semibold text-amber-700">
                              {formatCurrencyFromCents(transferredCents)}
                            </p>
                          </div>
                        ) : null}
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs text-slate-500">Itens</p>
                          <p className="mt-1 font-semibold text-slate-950">
                            {invoice.items.length} parcelas
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-slate-200 border-t border-slate-200 bg-white">
                        {invoice.items.map((item) => (
                          <div className="p-4" key={item.id}>
                            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-semibold text-slate-950">
                                    {item.purchase_description}
                                  </h4>
                                  {item.category_name ? (
                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      {item.category_name}
                                    </span>
                                  ) : null}
                                  <span
                                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                      billStatusStyles[item.status]
                                    }`}
                                  >
                                    {billStatusLabels[item.status]}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-slate-500">
                                  Parcela {item.installment_number}/
                                  {item.installments_count} · vence{" "}
                                  {formatDate(item.due_date)}
                                </p>
                              </div>

                              <strong className="text-lg text-slate-950">
                                {formatCurrencyFromCents(item.amount_cents)}
                              </strong>

                              {item.status !== "paid" &&
                              item.status !== "cancelled" ? (
                                <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                                  <form action={moveInstallmentInvoice}>
                                    <CardsReturnState {...cardsReturnState} />
                                    <input
                                      name="id"
                                      type="hidden"
                                      value={item.id}
                                    />
                                    <input
                                      name="direction"
                                      type="hidden"
                                      value="previous"
                                    />
                                    <ConfirmButton
                                      className="h-9"
                                      message="Adiantar esta parcela para a fatura anterior?"
                                      pendingLabel="Movendo..."
                                    >
                                      Adiantar
                                    </ConfirmButton>
                                  </form>
                                  <form action={moveInstallmentInvoice}>
                                    <CardsReturnState {...cardsReturnState} />
                                    <input
                                      name="id"
                                      type="hidden"
                                      value={item.id}
                                    />
                                    <input
                                      name="direction"
                                      type="hidden"
                                      value="next"
                                    />
                                    <ConfirmButton
                                      className="h-9"
                                      message="Atrasar esta parcela para a próxima fatura?"
                                      pendingLabel="Movendo..."
                                    >
                                      Atrasar
                                    </ConfirmButton>
                                  </form>
                                  <form action={markInstallmentAsPaid}>
                                    <CardsReturnState {...cardsReturnState} />
                                    <input
                                      name="id"
                                      type="hidden"
                                      value={item.id}
                                    />
                                    <ConfirmButton
                                      className="h-9"
                                      message={`Pagar esta parcela de ${formatCurrencyFromCents(item.amount_cents)}?`}
                                      pendingLabel="Pagando..."
                                      variant="emerald"
                                    >
                                      Pagar
                                    </ConfirmButton>
                                  </form>
                                  {item.can_delete_purchase ? (
                                    <form action={deleteCreditCardPurchase}>
                                      <CardsReturnState {...cardsReturnState} />
                                      <input
                                        name="id"
                                        type="hidden"
                                        value={item.purchase_id}
                                      />
                                      <ConfirmButton
                                        className="h-9"
                                        message={`Excluir a compra "${item.purchase_description}" e todas as parcelas dela?`}
                                        pendingLabel="Excluindo..."
                                        variant="danger"
                                      >
                                        Excluir compra
                                      </ConfirmButton>
                                    </form>
                                  ) : null}
                                  {!item.source_invoice_transaction_id &&
                                  item.installments_count > 1 ? (
                                    <details className="group w-full rounded-2xl border border-slate-200 bg-slate-50 p-2 md:w-64">
                                      <summary className="cursor-pointer list-none text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500 transition hover:text-slate-950 [&::-webkit-details-marker]:hidden">
                                        Editar parcelas
                                      </summary>
                                      <form
                                        action={
                                          adjustCreditCardPurchaseInstallments
                                        }
                                        className="mt-3 grid gap-2"
                                      >
                                        <CardsReturnState
                                          {...cardsReturnState}
                                        />
                                        <input
                                          name="id"
                                          type="hidden"
                                          value={item.purchase_id}
                                        />
                                        <label className="text-xs font-semibold text-slate-500">
                                          Total correto
                                          <input
                                            className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                            defaultValue={
                                              item.installments_count
                                            }
                                            max={item.installments_count - 1}
                                            min={1}
                                            name="installments_count"
                                            type="number"
                                          />
                                        </label>
                                        <SubmitButton
                                          className="h-9 bg-slate-950 text-xs text-white hover:bg-emerald-700"
                                          pendingLabel="Ajustando..."
                                        >
                                          Salvar ajuste
                                        </SubmitButton>
                                        <p className="text-xs leading-relaxed text-slate-500">
                                          Remove apenas as parcelas finais não
                                          pagas.
                                        </p>
                                      </form>
                                    </details>
                                  ) : null}
                                </div>
                              ) : item.paid_transaction_id &&
                                !invoice.payment_transaction_id ? (
                                <form action={revokeInvoicePayment}>
                                  <CardsReturnState {...cardsReturnState} />
                                  <input
                                    name="transaction_id"
                                    type="hidden"
                                    value={item.paid_transaction_id}
                                  />
                                  <ConfirmButton
                                    className="h-9"
                                    message={`Revogar o pagamento desta parcela? A transação será excluída e a parcela voltará para em aberto ou atrasada.`}
                                    pendingLabel="Revogando..."
                                    variant="danger"
                                  >
                                    Revogar
                                  </ConfirmButton>
                                </form>
                              ) : (
                                <span className="text-xs font-semibold text-slate-400 md:text-right">
                                  Sem ação
                                </span>
                              )}
                            </div>

                            {item.source_invoice_details.length > 0 ? (
                              <details className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
                                <summary className="cursor-pointer font-semibold text-slate-700">
                                  Ver detalhamento da fatura paga (
                                  {item.source_invoice_details.length} itens)
                                </summary>
                                <div className="mt-3 grid gap-2 pl-3">
                                  {item.source_invoice_details.map((detail) => (
                                    <div
                                      className="grid gap-2 rounded-2xl bg-white p-3 md:grid-cols-[1fr_auto] md:items-center"
                                      key={detail.id}
                                    >
                                      <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-semibold text-slate-900">
                                            {detail.purchase_description}
                                          </p>
                                          {detail.category_name ? (
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                              {detail.category_name}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {detail.card_name} · parcela{" "}
                                          {detail.installment_number}/
                                          {detail.installments_count}
                                        </p>
                                      </div>
                                      <strong className="text-sm text-slate-950 md:text-right">
                                        {formatCurrencyFromCents(
                                          detail.amount_cents,
                                        )}
                                      </strong>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </article>
            ))
          ) : (
            <EmptyState
              description="Tente trocar o filtro, limpar a busca ou registrar uma compra no cartão."
              icon={CalendarCheck2}
              title="Nenhuma fatura encontrada"
            />
          )}
        </div>
      </Surface>
    </PageFrame>
  );
}
