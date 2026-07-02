import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ReceiptText,
  SearchX,
  XCircle,
} from "lucide-react";

import {
  EmptyState,
  MetricCard,
  PageFrame,
  PageHero,
  SoftBadge,
  Surface,
} from "@/components/app-ui";
import { ConfirmButton } from "@/components/confirm-button";
import { DeleteButton } from "@/components/delete-button";
import { BillForm } from "@/features/bills/bill-form";
import {
  createBill,
  deleteBill,
  updateBillStatus,
} from "@/features/bills/actions";
import {
  billStatusLabels,
  billStatusStyles,
  recurrenceLabels,
} from "@/features/bills/constants";
import { getBills } from "@/features/bills/data";
import { getCategories } from "@/features/categories/data";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

type BillsPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const params = await searchParams;
  const [billsResult, categoriesResult] = await Promise.all([
    getBills(),
    getCategories(),
  ]);
  const pendingTotal = billsResult.bills
    .filter((bill) => bill.status === "pending" || bill.status === "overdue")
    .reduce((total, bill) => total + bill.amount_cents, 0);
  const paidTotal = billsResult.bills
    .filter((bill) => bill.status === "paid")
    .reduce((total, bill) => total + bill.amount_cents, 0);
  const overdueCount = billsResult.bills.filter(
    (bill) => bill.status === "overdue",
  ).length;
  const pageError =
    params.error ?? billsResult.error ?? categoriesResult.error ?? null;

  return (
    <PageFrame>
      <PageHero
        actions={
          <a
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-100"
            href="#nova-conta"
          >
            Criar conta
          </a>
        }
        description="Cadastre contas a pagar ou receber, acompanhe recorrências e deixe os lembretes do bot prontos para agir."
        eyebrow="Contas futuras"
        title="Vencimentos sem susto no fim do mês."
        variant="dark"
      >
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {billsResult.bills.length} contas cadastradas
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            Recorrências e status automáticos
          </SoftBadge>
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

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          description="Valor total ainda em aberto ou atrasado."
          icon={Clock}
          label="Pendentes/atrasadas"
          tone="amber"
          value={formatCurrencyFromCents(pendingTotal)}
        />
        <MetricCard
          description="Contas marcadas como pagas no histórico."
          icon={CheckCircle2}
          label="Pagas"
          tone="emerald"
          value={formatCurrencyFromCents(paidTotal)}
        />
        <MetricCard
          description="Quantidade de contas que já passaram do vencimento."
          icon={XCircle}
          label="Atrasadas"
          tone={overdueCount > 0 ? "red" : "slate"}
          value={String(overdueCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <div id="nova-conta">
          <BillForm
            action={createBill}
            categories={categoriesResult.categories}
          />
        </div>

        <Surface
          action={
            <span className="rounded-2xl bg-slate-950 p-2 text-white">
              <ReceiptText className="size-5" />
            </span>
          }
          className="min-w-0"
          description="Acompanhe status, recorrência e vencimento sem precisar abrir cada item."
          title="Lista de contas"
        >
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
            {billsResult.bills.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {billsResult.bills.map((bill) => (
                  <div
                    className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_145px_132px_220px] xl:items-center"
                    key={bill.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              bill.categories?.color ?? "#64748b",
                          }}
                        />
                        <p className="truncate font-semibold text-slate-900">
                          {bill.name}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {bill.categories?.name ?? "Sem categoria"} ·{" "}
                        {recurrenceLabels[bill.recurrence]} · vence em{" "}
                        {formatDate(bill.due_date)}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-950">
                      {formatCurrencyFromCents(bill.amount_cents)}
                    </p>
                    <SoftBadge
                      className={`w-fit ${billStatusStyles[bill.status]}`}
                    >
                      {billStatusLabels[bill.status]}
                    </SoftBadge>
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      {bill.status !== "paid" ? (
                        <form action={updateBillStatus}>
                          <input name="id" type="hidden" value={bill.id} />
                          <input name="status" type="hidden" value="paid" />
                          <ConfirmButton
                            message={`Marcar "${bill.name}" como paga?`}
                            pendingLabel="Pagando..."
                            variant="emerald"
                          >
                            Pagar
                          </ConfirmButton>
                        </form>
                      ) : null}
                      {bill.status !== "cancelled" ? (
                        <form action={updateBillStatus}>
                          <input name="id" type="hidden" value={bill.id} />
                          <input
                            name="status"
                            type="hidden"
                            value="cancelled"
                          />
                          <ConfirmButton
                            message={`Cancelar "${bill.name}"?`}
                            pendingLabel="Cancelando..."
                          >
                            Cancelar
                          </ConfirmButton>
                        </form>
                      ) : null}
                      <form action={deleteBill}>
                        <input name="id" type="hidden" value={bill.id} />
                        <DeleteButton message="Excluir esta conta?">
                          Excluir
                        </DeleteButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Crie contas futuras para o dashboard projetado e o bot de lembretes ficarem úteis."
                icon={SearchX}
                title="Nenhuma conta cadastrada"
              />
            )}
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Contas pendentes e atrasadas entram no saldo projetado do dashboard.
          </div>
        </Surface>
      </section>
    </PageFrame>
  );
}
