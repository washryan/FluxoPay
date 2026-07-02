import type { CreditCard } from "@/features/cards/data";
import type { Category } from "@/features/categories/data";
import { SubmitButton } from "@/components/submit-button";

type CreditCardPurchaseFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cards: CreditCard[];
  categories: Category[];
};

export function CreditCardPurchaseForm({
  action,
  cards,
  categories,
}: CreditCardPurchaseFormProps) {
  const hasCards = cards.length > 0;

  return (
    <form
      action={action}
      className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold">Nova compra no cartão</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        Registre uma compra e o FluxoPay gera as parcelas pela data de
        fechamento e vencimento do cartão.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Cartão
          <select
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
            name="credit_card_id"
            required
            defaultValue={cards[0]?.id ?? ""}
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {card.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Valor total
          <input
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
            inputMode="decimal"
            name="total_amount"
            placeholder="Ex: 300,00"
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Descrição
          <input
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
            name="description"
            placeholder="Ex: Celular, mercado, passagem"
            required
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Data da compra
          <input
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
            name="purchase_date"
            required
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
          Parcelas
          <input
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
            max={72}
            min={1}
            name="installments_count"
            required
            type="number"
            defaultValue={1}
          />
        </label>

        <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Categoria
          <select
            className="h-11 min-w-0 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={!hasCards}
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
      </div>

      {!hasCards ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Cadastre um cartão antes de lançar compras parceladas.
        </div>
      ) : null}

      <SubmitButton
        className="mt-5 h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
        disabled={!hasCards}
        pendingLabel="Registrando compra..."
      >
        Registrar compra
      </SubmitButton>
    </form>
  );
}
