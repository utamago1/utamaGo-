export function TryOutSectionSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat modul Try Out dan Laporan Belajar"
      className="space-y-4"
    >
      <div className="animate-pulse rounded-3xl border border-outline-variant bg-surface-container-low p-5">
        <div className="h-3.5 w-32 rounded bg-surface-container-high" />
        <div className="mt-3 h-7 w-64 rounded-lg bg-surface-container-high" />
        <div className="mt-2 h-4 w-full max-w-md rounded bg-surface-container-high" />
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="h-14 rounded-2xl bg-surface-container" />
          <div className="h-14 rounded-2xl bg-surface-container" />
          <div className="h-14 rounded-2xl bg-surface-container" />
        </div>
      </div>

      <div className="animate-pulse rounded-3xl border border-outline-variant bg-surface-container-low p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-surface-container-high" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-40 rounded bg-surface-container-high" />
            <div className="h-5 w-52 rounded bg-surface-container-high" />
            <div className="h-4 w-full rounded bg-surface-container" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnkiDeckSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Memuat kartu kosakata Anki"
      className="animate-pulse rounded-3xl border border-outline-variant bg-surface-container-low p-6"
    >
      <div className="flex items-center justify-between border-b border-outline-variant pb-4">
        <div className="h-4 w-36 rounded bg-surface-container-high" />
        <div className="h-4 w-14 rounded bg-surface-container-high" />
      </div>
      <div className="my-10 flex flex-col items-center space-y-3">
        <div className="h-12 w-36 rounded-xl bg-surface-container-high" />
        <div className="h-4 w-24 rounded bg-surface-container" />
        <div className="h-3.5 w-64 rounded bg-surface-container" />
      </div>
      <div className="h-12 w-full rounded-2xl bg-surface-container-high" />
    </div>
  );
}
