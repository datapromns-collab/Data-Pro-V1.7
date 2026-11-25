export default function Loading() {
  return (
    <main
      aria-label="Cargando Data Pro"
      aria-busy="true"
      className="fixed inset-0 flex overflow-hidden bg-[#f8fafc] text-slate-700"
    >
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-6 md:block">
        <div className="mb-10 flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-2 w-16 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white/80 px-6">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </header>
        <div className="flex-1 space-y-6 overflow-hidden p-6 lg:p-8">
          <div className="h-11 w-full max-w-3xl animate-pulse rounded-full bg-slate-200/70" />
          <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
          <p className="text-center text-sm font-semibold text-slate-500">Preparando tus vistas y datos…</p>
        </div>
      </section>
    </main>
  );
}
