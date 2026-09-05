"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useTransition } from "react";

import { buildInvoiceQuery } from "@/features/cards/invoice-query";

const statusOptions = [
  { label: "Pendentes", value: "open" },
  { label: "Todas", value: "all" },
  { label: "Pagas", value: "paid" },
  { label: "Atrasadas", value: "overdue" },
];

type InvoiceFiltersProps = {
  invoiceSearch: string;
  invoiceStatus: string;
};

export function InvoiceFilters({
  invoiceSearch,
  invoiceStatus,
}: InvoiceFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(status: string, search: string) {
    const query = buildInvoiceQuery(status, search);

    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, {
        scroll: false,
      });
    });
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = String(new FormData(event.currentTarget).get("q") ?? "");
    navigate(invoiceStatus, search);
  }

  return (
    <div
      aria-busy={isPending}
      className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <div
        aria-label="Filtrar faturas por status"
        className="flex flex-wrap gap-2"
      >
        {statusOptions.map((option) => (
          <button
            aria-pressed={invoiceStatus === option.value}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
              invoiceStatus === option.value
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
            disabled={isPending}
            key={option.value}
            onClick={() => navigate(option.value, invoiceSearch)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
        <label className="relative">
          <span className="sr-only">Buscar nas faturas</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 min-w-0 rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-80"
            defaultValue={invoiceSearch}
            key={invoiceSearch}
            name="q"
            placeholder="Buscar por cartão, compra ou categoria"
          />
        </label>
        <button
          className="h-10 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
          disabled={isPending}
        >
          {isPending ? "Atualizando..." : "Buscar"}
        </button>
      </form>
    </div>
  );
}
