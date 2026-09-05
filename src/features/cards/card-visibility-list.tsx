"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "fluxopay:hidden-credit-cards:v1";
const STORAGE_EVENT = "fluxopay-card-visibility";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getServerSnapshot() {
  return "[]";
}

type CardVisibilityItem = {
  content: React.ReactNode;
  id: string;
  name: string;
};

type CardVisibilityListProps = {
  items: CardVisibilityItem[];
};

export function CardVisibilityList({ items }: CardVisibilityListProps) {
  const storedValue = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const validIds = new Set(items.map((item) => item.id));
  let hiddenIds: string[] = [];

  try {
    const stored = JSON.parse(storedValue);
    if (Array.isArray(stored)) {
      hiddenIds = stored.filter(
        (id): id is string => typeof id === "string" && validIds.has(id),
      );
    }
  } catch {
    hiddenIds = [];
  }

  function setCardHidden(id: string, hidden: boolean) {
    const next = hidden
      ? Array.from(new Set([...hiddenIds, id]))
      : hiddenIds.filter((candidate) => candidate !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {
      return;
    }
  }

  const hiddenSet = new Set(hiddenIds);
  const visibleItems = items.filter((item) => !hiddenSet.has(item.id));
  const hiddenItems = items.filter((item) => hiddenSet.has(item.id));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {visibleItems.map((item) => (
          <div className="relative" key={item.id}>
            {item.content}
            <button
              aria-label={`Ocultar ${item.name} nesta tela`}
              className="absolute right-16 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
              onClick={() => setCardHidden(item.id, true)}
              type="button"
            >
              <EyeOff className="size-3.5" />
              Ocultar
            </button>
          </div>
        ))}
      </div>

      {visibleItems.length === 0 && items.length > 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
          Todos os cartões estão ocultos nesta tela.
        </p>
      ) : null}

      {hiddenItems.length > 0 ? (
        <details className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-800">
            Outros cartões ({hiddenItems.length})
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            Esta preferência vale somente para este navegador e não altera
            faturas ou transações.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {hiddenItems.map((item) => (
              <div
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2"
                key={item.id}
              >
                <span className="truncate text-sm font-medium text-slate-800">
                  {item.name}
                </span>
                <button
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setCardHidden(item.id, false)}
                  type="button"
                >
                  <Eye className="size-3.5" />
                  Reexibir
                </button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
