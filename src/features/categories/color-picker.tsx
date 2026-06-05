"use client";

import { Palette } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

export const categoryColorPresets = [
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#84cc16",
  "#64748b",
];

type CategoryColorPickerProps = {
  defaultValue?: string;
  name?: string;
};

export function CategoryColorPicker({
  defaultValue = "#10b981",
  name = "color",
}: CategoryColorPickerProps) {
  const inputId = useId();
  const [selectedColor, setSelectedColor] = useState(defaultValue);

  return (
    <div className="grid gap-3">
      <input name={name} type="hidden" value={selectedColor} />
      <div className="grid grid-cols-6 gap-2">
        {categoryColorPresets.map((color) => (
          <button
            aria-label={`Selecionar cor ${color}`}
            className={cn(
              "size-9 rounded-2xl border border-white shadow-sm ring-offset-2 transition hover:scale-105",
              selectedColor.toLowerCase() === color.toLowerCase()
                ? "ring-2 ring-slate-950"
                : "ring-1 ring-slate-200",
            )}
            key={color}
            onClick={() => setSelectedColor(color)}
            style={{ backgroundColor: color }}
            type="button"
          />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span
            className="size-5 rounded-full border border-white shadow"
            style={{ backgroundColor: selectedColor }}
          />
          {selectedColor}
        </div>
        <label
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-700"
          htmlFor={inputId}
        >
          <Palette className="size-4" />
          Personalizar
        </label>
        <input
          className="sr-only"
          id={inputId}
          type="color"
          value={selectedColor}
          onChange={(event) => setSelectedColor(event.target.value)}
        />
      </div>
    </div>
  );
}
