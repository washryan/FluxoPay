import Link from "next/link";
import { notFound } from "next/navigation";

import { getCategories } from "@/features/categories/data";
import { updateTransaction } from "@/features/transactions/actions";
import { getTransaction } from "@/features/transactions/data";
import { TransactionForm } from "@/features/transactions/transaction-form";

type EditTransactionPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditTransactionPage({
  params,
  searchParams,
}: EditTransactionPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [categoriesResult, transactionResult] = await Promise.all([
    getCategories(),
    getTransaction(id),
  ]);

  if (!transactionResult.transaction) {
    notFound();
  }

  const action = updateTransaction.bind(null, id);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <Link
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            href="/transactions"
          >
            Voltar para transações
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Editar transação
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Ajuste os dados da movimentação. A atualização respeita RLS e só
            afeta registros do usuário logado.
          </p>
        </header>

        {query.error ?? categoriesResult.error ?? transactionResult.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {query.error ??
              categoriesResult.error ??
              "Não foi possível carregar a transação."}
          </div>
        ) : null}

        <TransactionForm
          action={action}
          categories={categoriesResult.categories}
          submitLabel="Salvar alterações"
          transaction={transactionResult.transaction}
        />
      </div>
    </div>
  );
}
