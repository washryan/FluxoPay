import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CreditCard,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { getDashboardData } from "@/features/dashboard/data";
import { MonthlyChart } from "@/features/dashboard/monthly-chart";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const cardToneClasses = {
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    value: "text-emerald-700",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    value: "text-red-600",
  },
  slate: {
    icon: "bg-slate-100 text-slate-800",
    value: "text-slate-950",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    value: "text-amber-700",
  },
};

type DashboardPageProps = {
  searchParams: Promise<{
    expenses?: string;
    trend?: string;
  }>;
};

function filterHref(
  params: { expenses?: string; trend?: string },
  next: { expenses?: string; trend?: string },
) {
  const query = new URLSearchParams();
  const expenses = next.expenses ?? params.expenses;
  const trend = next.trend ?? params.trend;

  if (expenses && expenses !== "month") {
    query.set("expenses", expenses);
  }

  if (trend && trend !== "6m") {
    query.set("trend", trend);
  }

  const value = query.toString();
  return value ? `/dashboard?${value}` : "/dashboard";
}

function FilterPills({
  active,
  options,
}: {
  active?: string;
  options: Array<{ href: string; label: string; value: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            active === option.value
              ? "bg-slate-950 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
          href={option.href}
          key={option.value}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const activeExpenses =
    params.expenses === "year" || params.expenses === "total"
      ? params.expenses
      : "month";
  const activeTrend =
    params.trend === "1y" || params.trend === "total" ? params.trend : "6m";
  const dashboard = await getDashboardData({
    expenseRange: activeExpenses,
    trendRange: activeTrend,
  });
  const cards = [
    {
      label: "Entradas do mês",
      value: formatCurrencyFromCents(dashboard.currentMonth.incomeCents),
      helper: `${dashboard.currentMonth.transactionsCount} movimentações no mês`,
      icon: ArrowUpRight,
      tone: "emerald",
    },
    {
      label: "Saídas do mês",
      value: formatCurrencyFromCents(dashboard.currentMonth.expenseCents),
      helper: "Somatório das despesas registradas",
      icon: ArrowDownRight,
      tone: "red",
    },
    {
      label: "Saldo realizado",
      value: formatCurrencyFromCents(
        dashboard.financialPosition.realizedBalanceCents,
      ),
      helper: "Transações desde o início até hoje",
      icon: Wallet,
      tone:
        dashboard.financialPosition.realizedBalanceCents >= 0
          ? "slate"
          : "red",
    },
    {
      label: "Saldo projetado",
      value: formatCurrencyFromCents(
        dashboard.financialPosition.projectedBalanceCents,
      ),
      helper: "Realizado menos cartões e contas em aberto",
      icon: CalendarClock,
      tone:
        dashboard.financialPosition.projectedBalanceCents >= 0
          ? "emerald"
          : "red",
    },
    {
      label: "Em aberto nos cartões",
      value: formatCurrencyFromCents(dashboard.financialPosition.openCardsCents),
      helper: "Parcelas pendentes e atrasadas",
      icon: CreditCard,
      tone: "amber",
    },
    {
      label: "Contas pendentes",
      value: formatCurrencyFromCents(
        dashboard.financialPosition.pendingBillsCents,
      ),
      helper: "Contas ainda em aberto",
      icon: CalendarClock,
      tone: "slate",
    },
  ] satisfies Array<{
    label: string;
    value: string;
    helper: string;
    icon: typeof ArrowUpRight;
    tone: keyof typeof cardToneClasses;
  }>;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="animate-rise card-sheen rounded-[2rem] bg-[linear-gradient(135deg,#022c22,#0f766e_55%,#84cc16)] p-6 text-white shadow-2xl shadow-emerald-950/20 md:p-8">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Visão geral das suas finanças.
            </h1>
            <p className="text-sm leading-6 text-emerald-50 md:text-base">
              Acompanhe entradas, saídas, saldo realizado, saldo projetado,
              contas próximas e categorias que mais pesam no orçamento.
            </p>
          </div>
        </header>

        {dashboard.error ? (
          <div className="flex gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-semibold">Banco ainda não sincronizado</p>
              <p className="mt-1 leading-6">{dashboard.error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const toneClasses = cardToneClasses[card.tone];

            return (
              <article
                className="interactive-card animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
                key={card.label}
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <span className={`rounded-2xl p-2 ${toneClasses.icon}`}>
                    <card.icon className="size-5" />
                  </span>
                </div>
                <p
                  className={`mt-4 text-3xl font-semibold tracking-tight ${toneClasses.value}`}
                >
                  {card.value}
                </p>
                <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
              </article>
            );
          })}
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Leitura rápida
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Resultado do mês</p>
              <p className="mt-2 text-xl font-semibold text-slate-950">
                {formatCurrencyFromCents(dashboard.currentMonth.balanceCents)}
              </p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-sm text-amber-800">Compromissos em aberto</p>
              <p className="mt-2 text-xl font-semibold text-amber-900">
                {formatCurrencyFromCents(
                  dashboard.financialPosition.openCardsCents +
                    dashboard.financialPosition.pendingBillsCents,
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-800">Relatório mensal</p>
              <Link
                className="mt-2 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                href="/resumo"
              >
                Abrir resumo
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fluxo mensal</h2>
                <p className="text-sm text-slate-500">
                  Entradas e saídas de {dashboard.trendRangeLabel}.
                </p>
              </div>
              <FilterPills
                active={activeTrend}
                options={[
                  {
                    href: filterHref(params, { trend: "6m" }),
                    label: "6 meses",
                    value: "6m",
                  },
                  {
                    href: filterHref(params, { trend: "1y" }),
                    label: "1 ano",
                    value: "1y",
                  },
                  {
                    href: filterHref(params, { trend: "total" }),
                    label: "Total",
                    value: "total",
                  },
                ]}
              />
            </div>
            <MonthlyChart data={dashboard.trend} />
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Contas próximas</h2>
                <p className="text-sm text-slate-500">
                  Vencimentos pendentes em até 7 dias.
                </p>
              </div>
              <span className="rounded-2xl bg-slate-950 p-2 text-white">
                <CalendarClock className="size-5" />
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {dashboard.upcomingBills.length > 0 ? (
                dashboard.upcomingBills.map((bill) => (
                  <div
                    className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    key={bill.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {bill.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Vence em {formatDate(bill.due_date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatCurrencyFromCents(bill.amount_cents)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  Nenhuma conta vencendo nos próximos 7 dias.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Maiores gastos</h2>
                <p className="text-sm text-slate-500">
                  Categorias com maior despesa em {dashboard.topExpenseRangeLabel}.
                </p>
              </div>
              <FilterPills
                active={activeExpenses}
                options={[
                  {
                    href: filterHref(params, { expenses: "month" }),
                    label: "Mês",
                    value: "month",
                  },
                  {
                    href: filterHref(params, { expenses: "year" }),
                    label: "Ano",
                    value: "year",
                  },
                  {
                    href: filterHref(params, { expenses: "total" }),
                    label: "Total",
                    value: "total",
                  },
                ]}
              />
            </div>
            <div className="mt-6 space-y-3">
              {dashboard.topExpenseCategories.length > 0 ? (
                dashboard.topExpenseCategories.map((category) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                    key={category.id}
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
                    <p className="text-sm font-semibold text-slate-950">
                      {formatCurrencyFromCents(category.amountCents)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  As maiores categorias aparecem quando houver despesas.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-slate-950 p-2 text-white">
                <Bot className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Telegram</h2>
                <p className="text-sm text-slate-500">
                  Preparado para vínculo seguro.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p className="rounded-2xl bg-slate-50 p-4">
                gastei 25 no mercado
              </p>
              <p className="rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                Entendi: saída de R$25,00. Confirmar?
              </p>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
