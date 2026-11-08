import type { AnalysisRow } from "@/lib/analyst";
import { aiProvider } from "@/lib/llm";

const CHECK_LABELS: [keyof AnalysisRow["checks"], string][] = [
  ["loads", "Loads"],
  ["https", "HTTPS"],
  ["mobileViewport", "Mobile viewport"],
  ["hasTitle", "Title"],
  ["hasDescription", "Description"],
  ["hasOgImage", "Share image"],
  ["hasLang", "Language set"],
];

// The overnight analyst's read on a project. Shows "analysis pending" until
// a model run has succeeded; the automated checks show either way.
export function AnalysisPanel({ analysis, compact = false }: { analysis: AnalysisRow | null; compact?: boolean }) {
  const ready = analysis?.status === "ready";
  const checks = analysis?.checks ?? {};
  const known = CHECK_LABELS.filter(([key]) => typeof checks[key] === "boolean");

  return (
    <section className="rounded-2xl border border-line bg-night/60 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">&gt;_ overnight analyst</p>
        {ready && analysis.readiness !== null ? (
          <p className="font-mono text-sm">
            <span className="text-muted">launch readiness </span>
            <span className={analysis.readiness >= 60 ? "text-signal" : "text-amber-200"}>{analysis.readiness}</span>
            <span className="text-muted">/100</span>
          </p>
        ) : (
          <p className="font-mono text-xs text-muted">
            {analysis?.status === "failed" ? "site didn't load" : aiProvider() ? "analysis pending" : "site checks only"}
          </p>
        )}
      </div>

      {ready && (
        <div className={`mt-3 grid gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
          {analysis.strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-signal">Strengths</p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {analysis.strengths.map((s) => (
                  <li key={s}>+ {s}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.risks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-200">Risks</p>
              <ul className="mt-1 space-y-1 text-sm text-muted">
                {analysis.risks.map((r) => (
                  <li key={r}>– {r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!compact && known.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
          {known.map(([key, label]) => (
            <li
              key={key}
              className={`rounded-full border px-2 py-0.5 ${checks[key] ? "border-signal/40 text-signal" : "border-line text-muted line-through"}`}
            >
              {label}
            </li>
          ))}
          {typeof checks.responseMs === "number" && (
            <li className="rounded-full border border-line px-2 py-0.5 text-muted">{checks.responseMs} ms</li>
          )}
        </ul>
      )}
    </section>
  );
}
