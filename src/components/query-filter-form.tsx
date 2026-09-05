"use client";

import { usePathname, useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useTransition } from "react";

type QueryFilterFormProps = {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
};

export function QueryFilterForm({
  children,
  className,
  pendingLabel = "Atualizando...",
}: QueryFilterFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();

    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      const normalizedValue = String(value).trim();
      if (normalizedValue && normalizedValue !== "all") {
        query.set(key, normalizedValue);
      }
    }

    startTransition(() => {
      router.replace(query.size ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      {children}
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 sm:col-span-2 xl:col-span-1 xl:self-end"
        disabled={isPending}
      >
        {isPending ? pendingLabel : "Filtrar"}
      </button>
    </form>
  );
}
