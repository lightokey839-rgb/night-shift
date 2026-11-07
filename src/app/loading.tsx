// Shown while a page's data loads: the page frame with quiet placeholders.
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-16 sm:px-6" aria-busy="true">
      <div className="flex items-center justify-between py-5">
        <span className="font-mono text-lg text-signal">&gt;_</span>
        <span className="h-9 w-32 rounded-full bg-panel" />
      </div>
      <div className="mt-10 h-4 w-48 animate-pulse rounded bg-panel motion-reduce:animate-none" />
      <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-panel motion-reduce:animate-none" />
      <div className="mt-3 h-12 w-1/2 animate-pulse rounded bg-panel motion-reduce:animate-none" />
      <div className="mt-8 aspect-[10/3] w-full animate-pulse rounded-2xl bg-panel motion-reduce:animate-none" />
      <p className="sr-only" role="status">
        Loading…
      </p>
    </div>
  );
}
