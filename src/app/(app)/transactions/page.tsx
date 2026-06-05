import Link from "next/link";

import { DeleteButton } from "@/components/delete-button";
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
      start: params.start,
      end: params.end,
      type: params.type,
      category: params.category,
    }),
  ]);

  const totalIncome = transactionsResult.transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);
  const totalExpense = transactionsResult.transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount_cents, 0);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Movimentações
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Transações
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Cadastre entradas e saídas, filtre por período, tipo e categoria, e
            mantenha seu dashboard sempre atualizado.
          </p>
        </header>

        {params.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {params.success}
          </div>
        ) : null}

        {params.error ?? categoriesResult.error ?? transactionsResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {params.error ??
              categoriesResult.error ??
              "Não foi possível carregar as transações."}
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <article className="interactive-card animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Entradas filtradas</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">
              {formatCurrencyFromCents(totalIncome)}
            </p>
          </article>
          <article className="interactive-card animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Saídas filtradas</p>
            <p className="mt-3 text-3xl font-semibold text-orange-600">
              {formatCurrencyFromCents(totalExpense)}
            </p>
          </article>
          <article className="interactive-card animate-rise rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Saldo filtrado</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {formatCurrencyFromCents(totalIncome - totalExpense)}
            </p>
          </article>
        </section>

        <section className="grid min-w-0 gap-5 2xl:grid-cols-[420px_minmax(0,1fr)]">
          <TransactionForm
            action={createTransaction}
            categories={categoriesResult.categories}
            submitLabel="Criar transação"
          />

          <article className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Histórico</h2>
                <p className="text-sm text-slate-500">
                  Mostrando até 100 transações mais recentes.
                </p>
              </div>
              <form
                className="flex w-full min-w-0 flex-wrap gap-3 xl:max-w-3xl xl:justify-end"
                action="/transactions"
              >
                <input
                  className="h-10 min-w-[148px] flex-1 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 xl:flex-none"
                  name="start"
                  type="date"
                  defaultValue={params.start}
                  aria-label="Data inicial"
                />
                <input
                  className="h-10 min-w-[148px] flex-1 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 xl:flex-none"
                  name="end"
                  type="date"
                  defaultValue={params.end}
                  aria-label="Data final"
                />
                <select
                  className="h-10 min-w-[132px] flex-1 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 xl:flex-none"
                  name="type"
                  defaultValue={params.type ?? "all"}
                  aria-label="Tipo"
                >
                  <option value="all">Todos</option>
                  <option value="income">Entradas</option>
                  <option value="expense">Saídas</option>
                </select>
                <select
                  className="h-10 min-w-[168px] flex-1 rounded-2xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 xl:flex-none"
                  name="category"
                  defaultValue={params.category ?? ""}
                  aria-label="Categoria"
                >
                  <option value="">Todas</option>
                  {categoriesResult.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button className="h-10 min-w-[96px] whitespace-nowrap rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Filtrar
                </button>
              </form>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
              {transactionsResult.transactions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {transactionsResult.transactions.map((transaction) => (
                    <div
                      className="grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_150px_110px_148px]"
                      key={transaction.id}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="size-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                transaction.categories?.color ?? "#64748b",
                            }}
                          />
                          <p className="min-w-0 truncate font-medium text-slate-900">
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
                            : "font-semibold text-orange-600"
                        }
                      >
                        {transaction.type === "income" ? "+" : "-"}{" "}
                        {formatCurrencyFromCents(transaction.amount_cents)}
                      </p>
                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {transactionTypeLabels[transaction.type]}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          href={`/transactions/${transaction.id}/edit`}
                        >
                          Editar
                        </Link>
                        <form action={deleteTransaction}>
                          <input
                            name="id"
                            type="hidden"
                            value={transaction.id}
                          />
                          <DeleteButton message="Excluir esta transação?">
                            Excluir
                          </DeleteButton>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center p-6 text-center text-sm text-slate-500">
                  Nenhuma transação encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
