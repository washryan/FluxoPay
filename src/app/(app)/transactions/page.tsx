import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ListChecks,
  SearchX,
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
import { DeleteButton } from "@/components/delete-button";
import { CreateDialog } from "@/components/create-dialog";
import { QueryFilterForm } from "@/components/query-filter-form";
import { getCategories } from "@/features/categories/data";
import {
  createTransaction,
  deleteTransaction,
} from "@/features/transactions/actions";
import {
  paymentMethodLabels,
  transactionTypeLabels,
} from "@/features/transactions/constants";
import { getTransactions } from "@/features/transactions/data";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

type TransactionsPageProps = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    type?: "income" | "expense" | "all";
    category?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const [categoriesResult, transactionsResult] = await Promise.all([
    getCategories(),
    getTransactions({
      category: params.category,
      end: params.end,
      start: params.start,
      type: params.type,
    }),
  ]);
  const totalIncome = transactionsResult.transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const totalExpense = transactionsResult.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const balance = totalIncome - totalExpense;
  const pageError =
    params.error ?? categoriesResult.error ?? transactionsResult.error ?? null;

  return (
    <PageFrame>
      <PageHero
        actions={
          <CreateDialog
            description="Informe os dados da movimentação realizada."
            label="Nova transação"
            key={`transaction-${params.success ?? params.error ?? "idle"}`}
            title="Nova transação"
            triggerClassName="bg-white font-black text-slate-950 shadow-lg shadow-black/10 hover:bg-emerald-100"
          >
            <TransactionForm
              action={createTransaction}
              categories={categoriesResult.categories}
              embedded
              returnState={params}
              submitLabel="Criar transação"
            />
          </CreateDialog>
        }
        description="Registre entradas e saídas, filtre por período e mantenha o dashboard batendo com a vida real."
        eyebrow="Movimentações"
        title="Transações com contexto, não só uma lista."
        variant="dark"
      >
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {transactionsResult.transactions.length} registros filtrados
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            Filtros por data, tipo e categoria
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
          description="Soma das entradas dentro dos filtros atuais."
          icon={ArrowUpRight}
          label="Entradas filtradas"
          tone="emerald"
          value={formatCurrencyFromCents(totalIncome)}
        />
        <MetricCard
          description="Soma das saídas dentro dos filtros atuais."
          icon={ArrowDownRight}
          label="Saídas filtradas"
          tone="red"
          value={formatCurrencyFromCents(totalExpense)}
        />
        <MetricCard
          description="Entradas menos saídas no recorte selecionado."
          icon={Wallet}
          label="Saldo filtrado"
          tone={balance >= 0 ? "slate" : "red"}
          value={formatCurrencyFromCents(balance)}
        />
      </section>

      <section className="min-w-0">
        <Surface
          action={
            <span className="rounded-2xl bg-slate-950 p-2 text-white">
              <ListChecks className="size-5" />
            </span>
          }
          className="min-w-0"
          description={
            params.start || params.end
              ? "Mostrando todas as transações do período selecionado."
              : "Mostrando até 50 transações realizadas nos últimos 30 dias."
          }
          title="Histórico"
          id="historico"
        >
          <QueryFilterForm
            className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/90 p-3 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
            key={[params.start, params.end, params.type, params.category].join(":")}
          >
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              Início
              <input
                aria-label="Data inicial"
                className="h-10 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="start"
                type="date"
                defaultValue={params.start}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              Fim
              <input
                aria-label="Data final"
                className="h-10 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="end"
                type="date"
                defaultValue={params.end}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              Tipo
              <select
                aria-label="Tipo"
                className="h-10 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="type"
                defaultValue={params.type ?? "all"}
              >
                <option value="all">Todos</option>
                <option value="income">Entradas</option>
                <option value="expense">Saídas</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-500">
              Categoria
              <select
                aria-label="Categoria"
                className="h-10 min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                name="category"
                defaultValue={params.category ?? ""}
              >
                <option value="">Todas</option>
                {categoriesResult.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </QueryFilterForm>

          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
            {transactionsResult.transactions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {transactionsResult.transactions.map((transaction) => (
                  <div
                    className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_150px_110px_148px] xl:items-center"
                    key={transaction.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              transaction.categories?.color ?? "#64748b",
                          }}
                        />
                        <p className="min-w-0 truncate font-semibold text-slate-900">
                          {transaction.description}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {transaction.categories?.name ?? "Sem categoria"} ·{" "}
                        {paymentMethodLabels[transaction.payment_method]} ·{" "}
                        {formatDate(transaction.transaction_date)}
                      </p>
                    </div>
                    <p
                      className={
                        transaction.type === "income"
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-red-600"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}{" "}
                      {formatCurrencyFromCents(transaction.amount_cents)}
                    </p>
                    <SoftBadge
                      className={
                        transaction.type === "income"
                          ? "w-fit border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "w-fit border-red-200 bg-red-50 text-red-700"
                      }
                    >
                      {transactionTypeLabels[transaction.type]}
                    </SoftBadge>
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <Link
                        className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        href={`/transactions/${transaction.id}/edit`}
                      >
                        Editar
                      </Link>
                      <form action={deleteTransaction}>
                        <input name="id" type="hidden" value={transaction.id} />
                        <DeleteButton message="Excluir esta transação?">
                          Excluir
                        </DeleteButton>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                action={
                  <CreateDialog
                    description="Informe os dados da movimentação realizada."
                    label="Nova transação"
                    title="Nova transação"
                  >
                    <TransactionForm
                      action={createTransaction}
                      categories={categoriesResult.categories}
                      embedded
                      returnState={params}
                      submitLabel="Criar transação"
                    />
                  </CreateDialog>
                }
                description={
                  params.start || params.end || params.type || params.category
                    ? "Ajuste os filtros ou registre uma nova movimentação."
                    : "Registre uma nova movimentação para começar seu histórico."
                }
                icon={SearchX}
                title="Nenhuma transação encontrada"
              />
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
            <CalendarDays className="size-4 shrink-0 text-slate-400" />A data da
            transação define em qual mês ela aparece no dashboard e no
            relatório.
          </div>
        </Surface>
      </section>
    </PageFrame>
  );
}
