import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CreditCard,
  ReceiptText,
  SearchX,
  WalletCards,
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
import type { FinancialObligation } from "@/features/obligations/data";
import { getFinancialObligations } from "@/features/obligations/data";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function dateToUtcTime(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return Date.UTC(year, month - 1, day);
}

function daysFromToday(value: string) {
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.round(
    (dateToUtcTime(value) - dateToUtcTime(todayInSaoPaulo())) / dayMs,
  );
}

function dueLabel(obligation: FinancialObligation) {
  const difference = daysFromToday(obligation.due_date);

  if (obligation.status === "overdue" || difference < 0) {
    const days = Math.abs(difference);

    return days <= 1 ? "Atrasado há 1 dia" : `Atrasado há ${days} dias`;
  }

  if (difference === 0) {
    return "Vence hoje";
  }

  if (difference === 1) {
    return "Vence amanhã";
  }

  return `Vence em ${difference} dias`;
}

function obligationDescription(obligation: FinancialObligation) {
  if (obligation.obligation_type === "bill") {
    return obligation.category_name
      ? `Conta · ${obligation.category_name}`
      : "Conta · Sem categoria";
  }

  const installment =
    obligation.installment_number && obligation.installments_count
      ? `Parcela ${obligation.installment_number}/${obligation.installments_count}`
      : "Parcela";

  return `${obligation.card_name ?? "Cartão"} · ${installment}`;
}

function ObligationList({
  emptyDescription,
  emptyTitle,
  items,
}: {
  emptyDescription: string;
  emptyTitle: string;
  items: FinancialObligation[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        description={emptyDescription}
        icon={SearchX}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white">
      {items.map((item) => (
        <div
          className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_150px_128px] md:items-center"
          key={item.id}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: item.category_color ?? "#64748b",
                }}
              />
              <p className="truncate font-semibold text-slate-950">
                {item.title}
              </p>
              <SoftBadge className={billStatusStyles[item.status]}>
                {billStatusLabels[item.status]}
              </SoftBadge>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {obligationDescription(item)} · {formatDate(item.due_date)}
            </p>
          </div>

          <p className="font-semibold text-slate-950">
            {formatCurrencyFromCents(item.amount_cents)}
          </p>

          <p
            className={`text-sm font-bold ${
              item.status === "overdue" ? "text-red-600" : "text-amber-700"
            }`}
          >
            {dueLabel(item)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default async function VencimentosPage() {
  const obligations = await getFinancialObligations();

  return (
    <PageFrame>
      <PageHero
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-100"
              href="/bills"
            >
              Nova conta
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20"
              href="/cards"
            >
              Nova compra
            </Link>
          </div>
        }
        description="Veja em uma única fila tudo que ainda pesa no caixa: parcelas de cartão pendentes, parcelas atrasadas, contas pendentes e contas atrasadas."
        eyebrow="Agenda financeira"
        title="Todos os gastos futuros em um só lugar."
        variant="dark"
      >
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            Base dos lembretes do bot
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {obligations.obligations.length} itens em aberto
          </SoftBadge>
        </div>
      </PageHero>

      {obligations.error ? (
        <div className="flex gap-3 rounded-[1.5rem] border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-900 shadow-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível carregar a agenda</p>
            <p className="mt-1 leading-6">{obligations.error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="Tudo que ainda está pendente ou atrasado."
          icon={WalletCards}
          label="Total em aberto"
          tone="slate"
          value={formatCurrencyFromCents(obligations.totals.allCents)}
        />
        <MetricCard
          description="Parcelas de cartão ainda não quitadas."
          icon={CreditCard}
          label="Crédito em aberto"
          tone="amber"
          value={formatCurrencyFromCents(obligations.totals.creditCents)}
        />
        <MetricCard
          description="Contas futuras ou atrasadas fora do cartão."
          icon={ReceiptText}
          label="Contas em aberto"
          tone="sky"
          value={formatCurrencyFromCents(obligations.totals.billCents)}
        />
        <MetricCard
          description="Parte que já passou do vencimento."
          icon={BellRing}
          label="Atrasados"
          tone={obligations.totals.overdueCents > 0 ? "red" : "emerald"}
          value={formatCurrencyFromCents(obligations.totals.overdueCents)}
        />
      </section>

      <Surface
        action={
          <span className="rounded-2xl bg-slate-950 p-2 text-white">
            <CalendarClock className="size-5" />
          </span>
        }
        description="A view `financial_obligations` no Supabase une contas e parcelas de cartão. O worker local pode usar essa mesma base para enviar alertas sem duplicar regra."
        title="Fonte única para lembretes"
      >
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Hoje e amanhã</p>
            <p className="mt-1 leading-6">
              Ideal para notificar vencimentos próximos no Telegram.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Atrasados</p>
            <p className="mt-1 leading-6">
              Mostra o que precisa de ação rápida antes de virar bola de neve.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">Cartões</p>
            <p className="mt-1 leading-6">
              Agrupa parcelas em aberto que formam as faturas futuras.
            </p>
          </div>
        </div>
      </Surface>

      <section className="grid gap-5 xl:grid-cols-2">
        <Surface
          description={`${obligations.groups.creditPending.length} parcela(s) de cartão ainda em aberto.`}
          title="Crédito pendente"
        >
          <ObligationList
            emptyDescription="Quando houver compras ou parcelas futuras no cartão, elas aparecerão aqui."
            emptyTitle="Nenhum crédito pendente"
            items={obligations.groups.creditPending}
          />
        </Surface>

        <Surface
          description={`${obligations.groups.creditOverdue.length} parcela(s) de cartão vencida(s).`}
          title="Crédito atrasado"
        >
          <ObligationList
            emptyDescription="Parcelas atrasadas de cartão aparecerão aqui para priorizar cobrança e alerta."
            emptyTitle="Nenhum crédito atrasado"
            items={obligations.groups.creditOverdue}
          />
        </Surface>

        <Surface
          description={`${obligations.groups.billPending.length} conta(s) ainda pendente(s).`}
          title="Contas pendentes"
        >
          <ObligationList
            emptyDescription="Cadastre contas futuras para o calendário financeiro ficar completo."
            emptyTitle="Nenhuma conta pendente"
            items={obligations.groups.billPending}
          />
        </Surface>

        <Surface
          description={`${obligations.groups.billOverdue.length} conta(s) vencida(s).`}
          title="Contas atrasadas"
        >
          <ObligationList
            emptyDescription="Contas vencidas e não pagas aparecerão aqui."
            emptyTitle="Nenhuma conta atrasada"
            items={obligations.groups.billOverdue}
          />
        </Surface>
      </section>
    </PageFrame>
  );
}
