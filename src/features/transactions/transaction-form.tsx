import type { Category } from "@/features/categories/data";
import {
  paymentMethodLabels,
  transactionTypeLabels,
} from "@/features/transactions/constants";
import type { Transaction } from "@/features/transactions/data";
import { formatCurrencyFromCents } from "@/lib/formatters";

type TransactionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
  submitLabel: string;
  transaction?: Transaction;
};

function toAmountInput(transaction?: Transaction) {
  if (!transaction) {
    return "";
  }

  return formatCurrencyFromCents(transaction.amount_cents)
    .replace("R$", "")
    .trim();
}

export function TransactionForm({
  action,
  categories,
  submitLabel,
  transaction,
}: TransactionFormProps) {
  return (
    <form
      action={action}
      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">
        {transaction ? "Editar transação" : "Nova transação"}
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Tipo
          <select
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="type"
            defaultValue={transaction?.type ?? "expense"}
          >
            {Object.entries(transactionTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Valor
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            inputMode="decimal"
            name="amount"
            placeholder="Ex: 25,90"
            required
            defaultValue={toAmountInput(transaction)}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Descrição
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="description"
            placeholder="Ex: Mercado, salário, internet"
            required
            defaultValue={transaction?.description}
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Categoria
          <select
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="category_id"
            defaultValue={transaction?.category_id ?? ""}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Forma de pagamento
          <select
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="payment_method"
            defaultValue={transaction?.payment_method ?? "pix"}
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Data
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="transaction_date"
            type="date"
            required
            defaultValue={
              transaction?.transaction_date ?? new Date().toISOString().slice(0, 10)
            }
          />
        </label>
      </div>
      <button className="mt-5 h-11 whitespace-nowrap rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
        {submitLabel}
      </button>
    </form>
  );
}
