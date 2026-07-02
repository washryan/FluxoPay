import {
  CalendarDays,
  CreditCard,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { billStatusLabels, billStatusStyles } from "@/features/bills/constants";
import { getMonthlyReport } from "@/features/reports/data";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

type SummaryPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function StatCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: "emerald" | "red" | "slate" | "amber";
  value: string;
}) {
  const tones = {
    amber: "bg-amber-50 text-amber-800",
    emerald: "bg-emerald-50 text-emerald-800",
    red: "bg-red-50 text-red-700",
    slate: "bg-slate-50 text-slate-900",
  };

  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 rounded-2xl p-3 text-2xl font-semibold ${tones[tone]}`}>
        {value}
      </p>
      <p className="mt-3 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const params = await searchParams;
  const report = await getMonthlyReport(params.month);
  const previousMonth = shiftMonth(report.month, -1);
  const nextMonth = shiftMonth(report.month, 1);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                Resumo mensal
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Relatório de {report.monthLabel}.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Entradas, saídas, faturas, contas, categorias e maiores gastos
                em uma visão fechada por mês.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href={`/resumo?month=${previousMonth}`}
              >
                Mês anterior
              </Link>
              <form action="/resumo" className="flex items-center gap-2">
                <input
                  className="h-10 rounded-full border border-slate-200 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  defaultValue={report.month}
                  name="month"
                  type="month"
                />
                <button className="h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Filtrar
                </button>
              </form>
              <Link
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href={`/resumo?month=${nextMonth}`}
              >
                Próximo mês
              </Link>
            </div>
          </div>
        </header>

        {report.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {report.error}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            helper={`${report.transactions.count} transações realizadas`}
            label="Entradas"
            tone="emerald"
            value={formatCurrencyFromCents(report.totals.incomeCents)}
          />
          <StatCard
            helper="Despesas registradas como transação"
            label="Saídas"
            tone="red"
            value={formatCurrencyFromCents(report.totals.expenseCents)}
          />
          <StatCard
            helper="Entradas menos saídas realizadas"
            label="Saldo do mês"
            tone={report.totals.balanceCents >= 0 ? "slate" : "red"}
            value={formatCurrencyFromCents(report.totals.balanceCents)}
          />
          <StatCard
            helper="Total de parcelas que vencem no mês"
            label="Faturas"
            tone="amber"
            value={formatCurrencyFromCents(report.totals.cardInvoiceCents)}
          />
          <StatCard
            helper="Contas pendentes/atrasadas no mês"
            label="Contas pendentes"
            tone="slate"
            value={formatCurrencyFromCents(report.totals.billPendingCents)}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-amber-50 p-2 text-amber-700">
                <CreditCard className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Faturas do mês</h2>
                <p className="text-sm text-slate-500">
                  Cartões agrupados pelo vencimento no mês selecionado.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {report.invoices.length > 0 ? (
                report.invoices.map((invoice) => (
                  <div
                    className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center"
                    key={invoice.key}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">
                          {invoice.cardName}
                        </p>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            billStatusStyles[invoice.status]
                          }`}
                        >
                          {billStatusLabels[invoice.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {invoice.itemsCount} parcelas · em aberto{" "}
                        {formatCurrencyFromCents(invoice.openCents)}
                      </p>
                    </div>
                    <strong className="text-lg text-slate-950 md:text-right">
                      {formatCurrencyFromCents(invoice.totalCents)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhuma fatura com vencimento neste mês.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-950 p-2 text-white">
                <CalendarDays className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Contas</h2>
                <p className="text-sm text-slate-500">
                  Pendentes, atrasadas e pagas no mês.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {[...report.bills.overdue, ...report.bills.pending, ...report.bills.paid]
                .slice(0, 8)
                .map((bill) => (
                  <div
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    key={bill.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {bill.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(bill.due_date)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          billStatusStyles[bill.status]
                        }`}
                      >
                        {billStatusLabels[bill.status]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-950">
                      {formatCurrencyFromCents(bill.amount_cents)}
                    </p>
                  </div>
                ))}
              {report.bills.overdue.length +
                report.bills.pending.length +
                report.bills.paid.length ===
              0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Nenhuma conta com vencimento neste mês.
                </div>
              ) : null}
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-3">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <TrendingDown className="size-5 text-red-600" />
              <h2 className="text-lg font-semibold">Maiores gastos</h2>
            </div>
            <div className="mt-5 space-y-3">
              {report.transactions.largestExpenses.length > 0 ? (
                report.transactions.largestExpenses.map((expense) => (
                  <div
                    className="rounded-2xl bg-slate-50 p-4"
                    key={expense.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {expense.description}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(expense.date)} · {expense.categoryName}
                        </p>
                      </div>
                      <strong className="text-sm text-slate-950">
                        {formatCurrencyFromCents(expense.amountCents)}
                      </strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Sem despesas realizadas neste mês.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ReceiptText className="size-5 text-slate-700" />
              <h2 className="text-lg font-semibold">Categorias realizadas</h2>
            </div>
            <div className="mt-5 space-y-3">
              {report.categories.length > 0 ? (
                report.categories.map((category) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    key={category.key}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <p className="font-medium text-slate-800">
                        {category.name}
                      </p>
                    </div>
                    <strong className="text-sm text-slate-950">
                      {formatCurrencyFromCents(category.amountCents)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Sem categorias realizadas neste mês.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-5 text-emerald-700" />
              <h2 className="text-lg font-semibold">Categorias nas faturas</h2>
            </div>
            <div className="mt-5 space-y-3">
              {report.cardCategories.length > 0 ? (
                report.cardCategories.map((category) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    key={category.key}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <p className="font-medium text-slate-800">
                        {category.name}
                      </p>
                    </div>
                    <strong className="text-sm text-slate-950">
                      {formatCurrencyFromCents(category.amountCents)}
                    </strong>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Sem parcelas de cartão neste mês.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
