import { Palette, SearchX, ShieldCheck, Tags } from "lucide-react";

import {
  EmptyState,
  MetricCard,
  PageFrame,
  PageHero,
  SoftBadge,
  Surface,
} from "@/components/app-ui";
import { DeleteButton } from "@/components/delete-button";
import { SubmitButton } from "@/components/submit-button";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/categories/actions";
import { CategoryEditForm } from "@/features/categories/category-edit-form";
import { CategoryColorPicker } from "@/features/categories/color-picker";
import { getCategories } from "@/features/categories/data";

type CategoriesPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

const typeLabels = {
  both: "Ambos",
  expense: "Saída",
  income: "Entrada",
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const [{ error, success }, result] = await Promise.all([
    searchParams,
    getCategories(),
  ]);
  const customCount = result.categories.filter(
    (category) => !category.is_default,
  ).length;
  const defaultCount = result.categories.length - customCount;
  const expenseCount = result.categories.filter(
    (category) => category.type === "expense" || category.type === "both",
  ).length;
  const pageError = error ?? result.error ?? null;

  return (
    <PageFrame>
      <PageHero
        actions={
          <a
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 transition hover:bg-emerald-100"
            href="#nova-categoria"
          >
            Criar categoria
          </a>
        }
        description="Defina nomes e cores que aparecem nas transações, filtros, dashboard, relatórios e parser do Telegram."
        eyebrow="Organização"
        title="Categorias que deixam seus gastos legíveis."
        variant="dark"
      >
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            {result.categories.length} categorias
          </SoftBadge>
          <SoftBadge className="border-white/15 bg-white/10 text-emerald-50">
            Padrões protegidas
          </SoftBadge>
        </div>
      </PageHero>

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {pageError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          description="Categorias criadas por você para seu uso real."
          icon={Tags}
          label="Customizadas"
          tone="emerald"
          value={String(customCount)}
        />
        <MetricCard
          description="Categorias base criadas no onboarding."
          icon={ShieldCheck}
          label="Padrões"
          tone="slate"
          value={String(defaultCount)}
        />
        <MetricCard
          description="Categorias disponíveis para despesas."
          icon={Palette}
          label="Usáveis em saídas"
          tone="amber"
          value={String(expenseCount)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Surface
          className="h-fit"
          id="nova-categoria"
          title="Nova categoria"
          description="Use uma cor pronta ou abra a paleta para escolher manualmente."
        >
          <form action={createCategory} className="grid gap-4">
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
            <SubmitButton
              className="h-11 bg-slate-950 text-white hover:bg-slate-800"
              pendingLabel="Criando..."
            >
              Criar categoria
            </SubmitButton>
          </form>
        </Surface>

        <Surface
          action={
            <span className="rounded-2xl bg-slate-950 p-2 text-white">
              <Tags className="size-5" />
            </span>
          }
          className="min-w-0"
          description={`${result.categories.length} categorias cadastradas para classificar entradas, saídas e relatórios.`}
          title="Suas categorias"
        >
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
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
                          <p className="truncate font-semibold text-slate-900">
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
                              suppressHydrationWarning
                            />
                            <DeleteButton message="Excluir esta categoria? Transações antigas ficarão sem categoria.">
                              Excluir
                            </DeleteButton>
                          </form>
                        ) : (
                          <SoftBadge className="border-slate-200 bg-slate-100 text-slate-600">
                            Protegida
                          </SoftBadge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Crie sua primeira categoria para organizar entradas, saídas e relatórios."
                icon={SearchX}
                title="Nenhuma categoria encontrada"
              />
            )}
          </div>
        </Surface>
      </section>
    </PageFrame>
  );
}
