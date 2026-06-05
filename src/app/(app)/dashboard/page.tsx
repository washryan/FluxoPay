import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarClock,
} from "lucide-react";

import { getDashboardData } from "@/features/dashboard/data";
import { MonthlyChart } from "@/features/dashboard/monthly-chart";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();
  const cards = [
    {
      label: "Entradas do mês",
      value: formatCurrencyFromCents(dashboard.currentMonth.incomeCents),
      helper: `${dashboard.currentMonth.transactionsCount} movimentações no mês`,
      icon: ArrowUpRight,
    },
    {
      label: "Saídas do mês",
      value: formatCurrencyFromCents(dashboard.currentMonth.expenseCents),
      helper: "Somatório das despesas registradas",
      icon: ArrowDownRight,
    },
    {
      label: "Saldo",
      value: formatCurrencyFromCents(dashboard.currentMonth.balanceCents),
      helper: "Entradas menos saídas do mês",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="animate-rise card-sheen rounded-[2rem] bg-[linear-gradient(135deg,#022c22,#0f766e_55%,#84cc16)] p-6 text-white shadow-2xl shadow-emerald-950/20 md:p-8">
          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Visão geral das suas finanças.
            </h1>
            <p className="text-sm leading-6 text-emerald-50 md:text-base">
              Os números abaixo são carregados do Supabase respeitando RLS por
              usuário. Quando você cadastrar transações, o painel atualiza com
              totais, categorias e contas próximas.
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

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <article
              className="interactive-card animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
              key={card.label}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-500">
                  {card.label}
                </p>
                <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">
                  <card.icon className="size-5" />
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Fluxo mensal</h2>
                <p className="text-sm text-slate-500">
                  Entradas e saídas dos últimos 6 meses.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Recharts
              </span>
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Maiores gastos</h2>
                <p className="text-sm text-slate-500">
                  Categorias com maior despesa no mês atual.
                </p>
              </div>
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
