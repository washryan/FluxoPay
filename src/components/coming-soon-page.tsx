type ComingSoonPageProps = {
  title: string;
  description: string;
  items: string[];
};

export function ComingSoonPage({
  title,
  description,
  items,
}: ComingSoonPageProps) {
  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Próxima etapa
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div
              className="rounded-3xl border border-slate-200 bg-white p-5 text-sm font-medium leading-6 text-slate-700 shadow-sm"
              key={item}
            >
              {item}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
