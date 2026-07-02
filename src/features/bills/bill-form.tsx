import type { Category } from "@/features/categories/data";
import { billStatusLabels, recurrenceLabels } from "@/features/bills/constants";
import { SubmitButton } from "@/components/submit-button";

type BillFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  categories: Category[];
};

export function BillForm({ action, categories }: BillFormProps) {
  return (
    <form
      action={action}
      className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Nova conta</h2>
      <p className="mt-1 text-sm text-slate-500">
        Registre contas futuras a pagar ou receber.
      </p>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nome
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="name"
            placeholder="Ex: Internet, aluguel, energia"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Valor
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            inputMode="decimal"
            name="amount"
            placeholder="Ex: 180,00"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Vencimento
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="due_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <select
              className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              name="status"
              defaultValue="pending"
            >
              {Object.entries(billStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Recorrência
            <select
              className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              name="recurrence"
              defaultValue="none"
            >
              {Object.entries(recurrenceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Categoria
          <select
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="category_id"
            defaultValue=""
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
          Observações
          <textarea
            className="min-h-24 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="notes"
            placeholder="Opcional"
          />
        </label>

        <SubmitButton
          className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          pendingLabel="Criando..."
        >
          Criar conta
        </SubmitButton>
      </div>
    </form>
  );
}
