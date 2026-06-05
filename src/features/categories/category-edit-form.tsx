"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { CategoryColorPicker } from "@/features/categories/color-picker";
import type { Category } from "@/features/categories/data";

type CategoryEditFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  category: Category;
};

export function CategoryEditForm({ action, category }: CategoryEditFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Pencil className="size-3.5" />
        Editar
      </button>

      {isOpen ? (
        <form
          action={action}
          className="mt-4 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <input name="id" type="hidden" value={category.id} />
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nome
            <input
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              name="name"
              required
              defaultValue={category.name}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tipo
            <select
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              name="type"
              defaultValue={category.type}
            >
              <option value="expense">Saída</option>
              <option value="income">Entrada</option>
              <option value="both">Ambos</option>
            </select>
          </label>
          <div className="grid gap-2 text-sm font-medium text-slate-700">
            Cor
            <CategoryColorPicker defaultValue={category.color} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="h-10 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
              Salvar alterações
            </button>
            <button
              className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
              type="button"
              onClick={() => setIsOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
