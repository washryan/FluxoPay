import { DeleteButton } from "@/components/delete-button";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/categories/actions";
import { CategoryColorPicker } from "@/features/categories/color-picker";
import { CategoryEditForm } from "@/features/categories/category-edit-form";
import { getCategories } from "@/features/categories/data";

type CategoriesPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const typeLabels = {
  income: "Entrada",
  expense: "Saída",
  both: "Ambos",
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const [{ success, error }, result] = await Promise.all([
    searchParams,
    getCategories(),
  ]);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="animate-rise rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Organização
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            Categorias
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Crie e ajuste categorias para classificar entradas e saídas. A cor
            escolhida aparece no histórico, filtros e dashboard.
          </p>
        </header>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        {error ?? result.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error ?? "Não foi possível carregar categorias."}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form
            action={createCategory}
            className="h-fit rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Nova categoria</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use uma cor pronta ou abra a paleta para escolher manualmente.
            </p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome
                <input
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="name"
                  placeholder="Ex: Pet, Escola, Investimentos"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Tipo
                <select
                  className="h-11 rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="type"
                  defaultValue="expense"
                >
                  <option value="expense">Saída</option>
                  <option value="income">Entrada</option>
                  <option value="both">Ambos</option>
                </select>
              </label>
              <div className="grid gap-2 text-sm font-medium text-slate-700">
                Cor
                <CategoryColorPicker />
              </div>
              <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                Criar categoria
              </button>
            </div>
          </form>

          <article className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Suas categorias</h2>
                <p className="text-sm text-slate-500">
                  {result.categories.length} categorias cadastradas.
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
              {result.categories.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {result.categories.map((category) => (
                    <div className="p-4" key={category.id}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="size-4 shrink-0 rounded-full border border-white shadow"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {category.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {typeLabels[category.type]} ·{" "}
                              {category.is_default ? "Padrão" : "Customizada"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryEditForm
                            action={updateCategory}
                            category={category}
                          />
                          {!category.is_default ? (
                            <form action={deleteCategory}>
                              <input
                                name="id"
                                type="hidden"
                                value={category.id}
                              />
                              <DeleteButton message="Excluir esta categoria? Transações antigas ficarão sem categoria.">
                                Excluir
                              </DeleteButton>
                            </form>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                              Protegida
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-48 place-items-center p-6 text-center text-sm text-slate-500">
                  Nenhuma categoria encontrada. Se seu usuário foi criado antes
                  da migration, crie a primeira categoria manualmente.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
