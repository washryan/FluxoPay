"use client";

import { CreditCard, Settings2, X } from "lucide-react";
import { useState } from "react";

import { cardPresets } from "@/features/cards/presets";

type CardPreset = (typeof cardPresets)[number];

type PresetCardPickerProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function PresetCardPicker({ action }: PresetCardPickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<CardPreset | null>(null);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cardPresets.map((card) => (
          <article
            className={`interactive-card card-sheen animate-rise rounded-[1.75rem] bg-gradient-to-br ${card.gradient} p-5 text-white shadow-xl shadow-slate-950/10`}
            key={card.name}
          >
            <div className="relative z-10 flex min-h-44 flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-white/75">Modelo padrão</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    {card.name}
                  </h2>
                </div>
                <div className="grid size-12 place-items-center rounded-2xl bg-white/18 text-sm font-black tracking-tight ring-1 ring-white/20">
                  {card.shortName}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-white/85">
                  Fecha dia {card.closingDay} · vence dia {card.dueDay}
                </p>
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02]"
                  type="button"
                  onClick={() => setSelectedPreset(card)}
                >
                  <Settings2 className="size-4" />
                  Configurar
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {selectedPreset ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <div className="animate-rise w-full max-w-xl rounded-[2rem] border border-white/50 bg-white p-5 shadow-2xl shadow-slate-950/25 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${selectedPreset.gradient} text-sm font-black text-white shadow-lg`}
                >
                  {selectedPreset.shortName}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Configurar cartão
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                    {selectedPreset.name}
                  </h2>
                </div>
              </div>
              <button
                aria-label="Fechar modal"
                className="grid size-10 place-items-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                type="button"
                onClick={() => setSelectedPreset(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Revise as datas antes de salvar. Os dias abaixo são sugestões do
              modelo, mas você pode ajustar conforme a sua fatura real.
            </p>

            <form action={action} className="mt-5 grid gap-4">
              <input name="name" type="hidden" value={selectedPreset.name} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Dia de fechamento
                  <input
                    className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    max={31}
                    min={1}
                    name="closing_day"
                    required
                    type="number"
                    defaultValue={selectedPreset.closingDay}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Dia de vencimento
                  <input
                    className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    max={31}
                    min={1}
                    name="due_day"
                    required
                    type="number"
                    defaultValue={selectedPreset.dueDay}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Limite do cartão
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  inputMode="decimal"
                  name="limit"
                  placeholder="Ex: 2500,00 ou deixe em branco"
                />
              </label>

              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <CreditCard className="size-4" />
                  Como isso será usado
                </div>
                <p className="mt-2 leading-6">
                  O fechamento define se a compra entra na fatura atual ou na
                  próxima. O vencimento vira a data das parcelas geradas.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
                  Criar cartão
                </button>
                <button
                  className="h-11 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => setSelectedPreset(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
