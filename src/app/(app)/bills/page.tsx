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
import { CreateDialog } from "@/components/create-dialog";
import { DeleteButton } from "@/components/delete-button";
import { BillForm } from "@/features/bills/bill-form";
import {
  classifyBill,
  createBill,
  deleteBill,
  payBill,
  updateBillStatus,
} from "@/features/bills/actions";
import {
  billStatusLabels,
  billStatusStyles,
  billTypeLabels,
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
          <CreateDialog
            description="Escolha claramente se é uma conta a pagar ou a receber."
            label="Nova conta"
            key={`bill-${params.success ?? params.error ?? "idle"}`}
            title="Nova conta"
            triggerClassName="bg-white font-black text-slate-950 shadow-lg shadow-black/10 hover:bg-emerald-100"
          >
            <BillForm
              action={createBill}
              categories={categoriesResult.categories}
              embedded
            />
          </CreateDialog>
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

      <section>
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
                        {bill.type ? billTypeLabels[bill.type] : "Direção não classificada"} ·{" "}
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
                      {bill.status !== "paid" && bill.status !== "cancelled" && bill.type ? (
                        <form action={payBill}>
                          <input name="id" type="hidden" value={bill.id} />
                          <ConfirmButton
                            message={`Registrar ${bill.type === "expense" ? "o pagamento" : "o recebimento"} de "${bill.name}"?`}
                            pendingLabel="Pagando..."
                            variant="emerald"
                          >
                            {bill.type === "expense" ? "Pagar" : "Receber"}
                          </ConfirmButton>
                        </form>
                      ) : null}
                      {bill.status !== "paid" && bill.status !== "cancelled" && !bill.type ? (
                        <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold text-amber-900">
                            Esta conta é uma entrada ou uma saída?
                          </p>
                          <div className="flex gap-2">
                            <form action={classifyBill}>
                              <input name="id" type="hidden" value={bill.id} />
                              <input name="type" type="hidden" value="expense" />
                              <ConfirmButton message={`Classificar "${bill.name}" como conta a pagar?`} variant="danger">
                                Conta a pagar
                              </ConfirmButton>
                            </form>
                            <form action={classifyBill}>
                              <input name="id" type="hidden" value={bill.id} />
                              <input name="type" type="hidden" value="income" />
                              <ConfirmButton message={`Classificar "${bill.name}" como conta a receber?`} variant="emerald">
                                Conta a receber
                              </ConfirmButton>
                            </form>
                          </div>
                        </div>
                      ) : null}
                      {bill.status !== "paid" && bill.status !== "cancelled" ? (
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
                description="Crie uma conta a pagar ou a receber para acompanhar seus próximos vencimentos."
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
