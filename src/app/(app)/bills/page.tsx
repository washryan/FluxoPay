import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { ConfirmButton } from "@/components/confirm-button";
import { DeleteButton } from "@/components/delete-button";
import { createBill, deleteBill, updateBillStatus } from "@/features/bills/actions";
import {
  billStatusLabels,
  billStatusStyles,
  recurrenceLabels,
} from "@/features/bills/constants";
import { BillForm } from "@/features/bills/bill-form";
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

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Contas futuras
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Organize vencimentos e recorrências.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Cadastre contas a pagar ou receber, acompanhe o status e mantenha o
            dashboard preparado para lembretes pelo bot.
          </p>
        </header>

        {params.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.success}
          </div>
        ) : null}

        {params.error ?? billsResult.error ?? categoriesResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error ??
              billsResult.error ??
              "Não foi possível carregar contas."}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="interactive-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pendentes/atrasadas</p>
              <Clock className="size-5 text-amber-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {formatCurrencyFromCents(pendingTotal)}
            </p>
          </article>
          <article className="interactive-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pagas</p>
              <CheckCircle2 className="size-5 text-emerald-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">
              {formatCurrencyFromCents(paidTotal)}
            </p>
          </article>
          <article className="interactive-card rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Atrasadas</p>
              <XCircle className="size-5 text-red-600" />
            </div>
            <p className="mt-3 text-3xl font-semibold text-red-600">
              {overdueCount}
            </p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
          <BillForm
            action={createBill}
            categories={categoriesResult.categories}
          />

          <article className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Lista de contas</h2>
            <p className="mt-1 text-sm text-slate-500">
              {billsResult.bills.length} contas cadastradas.
            </p>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
              {billsResult.bills.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {billsResult.bills.map((bill) => (
                    <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_145px_132px_220px]" key={bill.id}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{
                              backgroundColor:
                                bill.categories?.color ?? "#64748b",
                            }}
                          />
                          <p className="truncate font-medium text-slate-900">
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
                      <span
                        className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${billStatusStyles[bill.status]}`}
                      >
                        {billStatusLabels[bill.status]}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateBillStatus}>
                          <input name="id" type="hidden" value={bill.id} />
                          <input name="status" type="hidden" value="paid" />
                          <ConfirmButton
                            message={`Marcar "${bill.name}" como paga?`}
                            variant="emerald"
                          >
                            Pagar
                          </ConfirmButton>
                        </form>
                        <form action={updateBillStatus}>
                          <input name="id" type="hidden" value={bill.id} />
                          <input name="status" type="hidden" value="cancelled" />
                          <ConfirmButton
                            message={`Cancelar "${bill.name}"?`}
                          >
                            Cancelar
                          </ConfirmButton>
                        </form>
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
                <div className="grid min-h-64 place-items-center p-6 text-center text-sm text-slate-500">
                  Nenhuma conta futura cadastrada ainda.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
