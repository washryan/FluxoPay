import {
  CalendarDays,
  CreditCard,
  FileText,
  ReceiptText,
  SearchX,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import {
  EmptyState,
  MetricCard,
  PageFrame,
  PageHero,
  SoftBadge,
  Surface,
} from "@/components/app-ui";
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

export default async function SummaryPage({ searchParams }: SummaryPageProps) {
  const params = await searchParams;
  const report = await getMonthlyReport(params.month);
  const previousMonth = shiftMonth(report.month, -1);
  const nextMonth = shiftMonth(report.month, 1);
  const billsCount =
    report.bills.overdue.length +
    report.bills.pending.length +
    report.bills.paid.length;

  return (
    <PageFrame>
      <PageHero
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              href={`/resumo?month=${previousMonth}`}
            >
              Mês anterior
            </Link>
            <form action="/resumo" className="flex items-center gap-2">
              <input
                className="h-10 rounded-full border border-white/20 bg-white px-4 text-sm text-slate-950 outline-none transition focus:ring-4 focus:ring-emerald-200"
                defaultValue={report.month}
                name="month"
                type="month"
              />
              <button className="h-10 rounded-full bg-white px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-100">
                Filtrar
              </button>
            </form>
            <Link
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              href={`/resumo?month=${nextMonth}`}
            >
              Próximo mês
            </Link>
          </div>
        }
        description="Entradas, saídas, faturas, contas, categorias e maiores gastos em uma visão fechada por mês."
        eyebrow="Resumo mensal"
        title={`Relatório de ${report.monthLabel}.`}
        variant="dark"
      >
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {report.transactions.count} transações
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {report.invoices.length} faturas
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {billsCount} contas
          </SoftBadge>
        </div>
      </PageHero>

      {report.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {report.error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          description={`${report.transactions.count} transações realizadas`}
          icon={TrendingUp}
          label="Entradas"
          tone="emerald"
          value={formatCurrencyFromCents(report.totals.incomeCents)}
        />
        <MetricCard
          description="Despesas registradas como transação."
          icon={TrendingDown}
          label="Saídas"
          tone="red"
          value={formatCurrencyFromCents(report.totals.expenseCents)}
        />
        <MetricCard
          description="Entradas menos saídas realizadas."
          icon={Wallet}
          label="Saldo do mês"
          tone={report.totals.balanceCents >= 0 ? "slate" : "red"}
          value={formatCurrencyFromCents(report.totals.balanceCents)}
        />
        <MetricCard
          description="Total de parcelas que vencem no mês."
          icon={CreditCard}
          label="Faturas"
          tone="amber"
          value={formatCurrencyFromCents(report.totals.cardInvoiceCents)}
        />
        <MetricCard
          description="Contas pendentes/atrasadas no mês."
          icon={ReceiptText}
          label="Contas pendentes"
          tone="sky"
          value={formatCurrencyFromCents(report.totals.billPendingCents)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Surface
          action={
            <span className="rounded-2xl bg-amber-50 p-2 text-amber-700">
              <CreditCard className="size-5" />
            </span>
          }
          title="Faturas do mês"
          description="Cartões agrupados pelo vencimento no mês selecionado."
        >
          <div className="grid gap-3">
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
                      <SoftBadge className={billStatusStyles[invoice.status]}>
                        {billStatusLabels[invoice.status]}
                      </SoftBadge>
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
              <EmptyState
                description="Quando houver parcelas vencendo neste mês, elas aparecem aqui."
                icon={SearchX}
                title="Nenhuma fatura no mês"
              />
            )}
          </div>
        </Surface>

        <Surface
          action={
            <span className="rounded-2xl bg-slate-950 p-2 text-white">
              <CalendarDays className="size-5" />
            </span>
          }
          title="Contas"
          description="Pendentes, atrasadas e pagas no mês."
        >
          <div className="space-y-3">
            {[
              ...report.bills.overdue,
              ...report.bills.pending,
              ...report.bills.paid,
            ]
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
                    <SoftBadge className={billStatusStyles[bill.status]}>
                      {billStatusLabels[bill.status]}
                    </SoftBadge>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">
                    {formatCurrencyFromCents(bill.amount_cents)}
                  </p>
                </div>
              ))}
            {billsCount === 0 ? (
              <EmptyState
                description="Nenhuma conta tem vencimento no mês selecionado."
                icon={SearchX}
                title="Sem contas no mês"
              />
            ) : null}
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Surface
          action={<TrendingDown className="size-5 text-red-600" />}
          title="Maiores gastos"
          description="As maiores despesas realizadas no mês."
        >
          <div className="space-y-3">
            {report.transactions.largestExpenses.length > 0 ? (
              report.transactions.largestExpenses.map((expense) => (
                <div className="rounded-2xl bg-slate-50 p-4" key={expense.id}>
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
              <EmptyState
                description="Sem despesas realizadas no mês selecionado."
                icon={SearchX}
                title="Sem maiores gastos"
              />
            )}
          </div>
        </Surface>

        <Surface
          action={<ReceiptText className="size-5 text-slate-700" />}
          title="Categorias realizadas"
          description="Despesas lançadas como transação."
        >
          <div className="space-y-3">
            {report.categories.length > 0 ? (
              report.categories.map((category) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                  key={category.key}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <p className="truncate font-medium text-slate-800">
                      {category.name}
                    </p>
                  </div>
                  <strong className="text-sm text-slate-950">
                    {formatCurrencyFromCents(category.amountCents)}
                  </strong>
                </div>
              ))
            ) : (
              <EmptyState
                description="Sem categorias realizadas neste mês."
                icon={SearchX}
                title="Sem categorias"
              />
            )}
          </div>
        </Surface>

        <Surface
          action={<FileText className="size-5 text-emerald-700" />}
          title="Categorias nas faturas"
          description="Categorias vindas de parcelas de cartão."
        >
          <div className="space-y-3">
            {report.cardCategories.length > 0 ? (
              report.cardCategories.map((category) => (
                <div
                  className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                  key={category.key}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <p className="truncate font-medium text-slate-800">
                      {category.name}
                    </p>
                  </div>
                  <strong className="text-sm text-slate-950">
                    {formatCurrencyFromCents(category.amountCents)}
                  </strong>
                </div>
              ))
            ) : (
              <EmptyState
                description="Sem parcelas de cartão neste mês."
                icon={SearchX}
                title="Sem categorias de cartão"
              />
            )}
          </div>
        </Surface>
      </section>
    </PageFrame>
  );
}
