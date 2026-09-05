export default function AppLoading() {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="h-52 animate-pulse rounded-[1.25rem] border border-slate-200 bg-slate-200/55" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-[1.1rem] border border-slate-200 bg-white" />
          <div className="h-32 animate-pulse rounded-[1.1rem] border border-slate-200 bg-white" />
          <div className="h-32 animate-pulse rounded-[1.1rem] border border-slate-200 bg-white" />
        </div>
        <div className="h-80 animate-pulse rounded-[1.25rem] border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
