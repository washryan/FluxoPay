import {
  AlertTriangle,
  ArrowDownRight,
  Bot,
  CalendarClock,
  CreditCard,
  Landmark,
  ReceiptText,
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
import { getDashboardData } from "@/features/dashboard/data";
import { MonthlyChart } from "@/features/dashboard/monthly-chart";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
            "rounded-full px-3 py-1.5 text-xs font-bold transition",
            active === option.value
              ? "bg-slate-950 text-white shadow-sm"
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
  const monthlyResultLabel =
    dashboard.currentMonth.balanceCents >= 0
      ? "Sobra no mês"
      : "Déficit no mês";
  const committedCents =
    dashboard.financialPosition.openCardsCents +
    dashboard.financialPosition.pendingBillsCents;

  return (
    <PageFrame>
      <PageHero
        eyebrow="Dashboard"
        title="Seu dinheiro, sem adivinhação."
        description="Veja o que já aconteceu, o que ainda está em aberto e o saldo projetado depois de cartões e contas pendentes."
        variant="dark"
        actions={
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-100"
            href="/transactions"
          >
            Nova transação
          </Link>
        }
      >
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Entradas do mês
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrencyFromCents(dashboard.currentMonth.incomeCents)}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              Saídas do mês
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-100">
              {formatCurrencyFromCents(dashboard.currentMonth.expenseCents)}
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
              {monthlyResultLabel}
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrencyFromCents(dashboard.currentMonth.balanceCents)}
            </p>
          </div>
        </div>
      </PageHero>

      {dashboard.error ? (
        <div className="flex gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Banco ainda não sincronizado</p>
            <p className="mt-1 leading-6">{dashboard.error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="Transações lançadas desde o início até hoje."
          icon={Wallet}
          label="Saldo realizado"
          tone={
            dashboard.financialPosition.realizedBalanceCents >= 0
              ? "slate"
              : "red"
          }
          value={formatCurrencyFromCents(
            dashboard.financialPosition.realizedBalanceCents,
          )}
        />
        <MetricCard
          description="Realizado menos cartões e contas ainda em aberto."
          icon={TrendingUp}
          label="Saldo projetado"
          tone={
            dashboard.financialPosition.projectedBalanceCents >= 0
              ? "emerald"
              : "red"
          }
          value={formatCurrencyFromCents(
            dashboard.financialPosition.projectedBalanceCents,
          )}
        />
        <MetricCard
          description="Parcelas pendentes ou atrasadas nos cartões."
          icon={CreditCard}
          label="Em aberto nos cartões"
          tone="amber"
          value={formatCurrencyFromCents(
            dashboard.financialPosition.openCardsCents,
          )}
        />
        <MetricCard
          description="Boletos, contas e recebíveis pendentes."
          icon={ReceiptText}
          label="Contas pendentes"
          tone="sky"
          value={formatCurrencyFromCents(
            dashboard.financialPosition.pendingBillsCents,
          )}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Surface
          title="Fluxo mensal"
          description={`Entradas e saídas de ${dashboard.trendRangeLabel}.`}
          action={
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
          }
        >
          <MonthlyChart data={dashboard.trend} />
        </Surface>

        <Surface
          title="Leitura rápida"
          description="Números para conferir o dia."
        >
          <div className="grid gap-3">
            <div className="rounded-3xl bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Landmark className="size-4" />
                Compromissos em aberto
              </div>
              <p className="mt-3 text-2xl font-semibold">
                {formatCurrencyFromCents(committedCents)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-3xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-800">Entradas do mês</p>
                <p className="mt-2 text-xl font-semibold text-emerald-800">
                  {formatCurrencyFromCents(dashboard.currentMonth.incomeCents)}
                </p>
              </div>
              <div className="rounded-3xl bg-red-50 p-4">
                <p className="text-sm text-red-800">Saídas do mês</p>
                <p className="mt-2 text-xl font-semibold text-red-700">
                  {formatCurrencyFromCents(dashboard.currentMonth.expenseCents)}
                </p>
              </div>
            </div>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
              href="/resumo"
            >
              Abrir relatório mensal
            </Link>
          </div>
        </Surface>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Surface
          title="Maiores gastos"
          description={`Categorias com maior despesa em ${dashboard.topExpenseRangeLabel}.`}
          action={
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
          }
        >
          <div className="space-y-3">
            {dashboard.topExpenseCategories.length > 0 ? (
              dashboard.topExpenseCategories.map((category, index) => (
                <div
                  className="grid gap-3 rounded-3xl bg-slate-50/90 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  key={category.id}
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-2xl bg-white text-sm font-black text-slate-600 shadow-sm">
                      {index + 1}
                    </span>
                    <span
                      aria-hidden="true"
                      className="size-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <p className="font-semibold text-slate-800">
                      {category.name}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-950">
                    {formatCurrencyFromCents(category.amountCents)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                description="Lance algumas saídas para o ranking aparecer aqui."
                icon={ArrowDownRight}
                title="Sem despesas no período"
              />
            )}
          </div>
        </Surface>

        <div className="grid gap-4">
          <Surface
            title="Contas próximas"
            description="Pendências com vencimento em até 7 dias."
            action={
              <span className="rounded-2xl bg-slate-950 p-2 text-white">
                <CalendarClock className="size-5" />
              </span>
            }
          >
            <div className="space-y-3">
              {dashboard.upcomingBills.length > 0 ? (
                dashboard.upcomingBills.map((bill) => (
                  <div
                    className="rounded-3xl border border-slate-100 bg-slate-50/90 p-4"
                    key={bill.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {bill.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Vence em {formatDate(bill.due_date)}
                        </p>
                      </div>
                      <SoftBadge className="border-white bg-white text-slate-700">
                        {formatCurrencyFromCents(bill.amount_cents)}
                      </SoftBadge>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  description="Quando uma conta estiver perto do vencimento, ela aparece aqui."
                  icon={CalendarClock}
                  title="Nada vencendo agora"
                />
              )}
            </div>
          </Surface>

          <Surface title="Telegram" description="Cadastro rápido por conversa.">
            <div className="space-y-3 text-sm">
              <p className="rounded-3xl bg-slate-50 p-4 text-slate-600">
                gastei 25 no mercado
              </p>
              <p className="rounded-3xl bg-emerald-50 p-4 font-medium text-emerald-900">
                Entendi: saída de R$25,00 em Mercado. Confirmar?
              </p>
              <Link
                className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900"
                href="/settings/telegram"
              >
                <Bot className="size-4" />
                Configurar Telegram
              </Link>
            </div>
          </Surface>
        </div>
      </section>
    </PageFrame>
  );
}
