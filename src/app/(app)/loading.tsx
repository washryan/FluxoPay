export default function AppLoading() {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="h-64 animate-pulse rounded-[2rem] bg-slate-200/70" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-36 animate-pulse rounded-[1.65rem] bg-white/80" />
          <div className="h-36 animate-pulse rounded-[1.65rem] bg-white/80" />
          <div className="h-36 animate-pulse rounded-[1.65rem] bg-white/80" />
        </div>
        <div className="h-96 animate-pulse rounded-[1.75rem] bg-white/80" />
      </div>
    </div>
  );
}
