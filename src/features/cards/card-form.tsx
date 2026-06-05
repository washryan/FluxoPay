import { CreditCard } from "lucide-react";

import { createCreditCard } from "@/features/cards/actions";

export function CustomCardForm() {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-slate-950 p-2 text-white">
          <CreditCard className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Cartão personalizado</h2>
          <p className="text-sm text-slate-500">
            Para bancos digitais, cooperativas ou cartões de loja.
          </p>
        </div>
      </div>

      <form action={createCreditCard} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Nome do cartão
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            name="name"
            placeholder="Ex: Cartão da família"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Fechamento
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            max={31}
            min={1}
            name="closing_day"
            placeholder="Dia"
            required
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Vencimento
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            max={31}
            min={1}
            name="due_day"
            placeholder="Dia"
            required
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
          Limite opcional
          <input
            className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            inputMode="decimal"
            name="limit"
            placeholder="Ex: 2500,00"
          />
        </label>
        <button className="h-11 w-fit rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
          Salvar cartão
        </button>
      </form>
    </article>
  );
}
