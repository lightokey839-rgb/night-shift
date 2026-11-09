import type { ReactNode } from "react";

// Shared building blocks for the /about and /pitch pages.

export function DocSection({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <p className="font-mono text-xs uppercase tracking-widest text-signal">&gt;_ {label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function Card({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-panel p-4 sm:p-5 ${accent ? "border-signal/40" : "border-line"}`}>
      {children}
    </div>
  );
}
