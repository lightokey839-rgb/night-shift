import { DECISIONS, VIBESTARTER_URL, type Decision } from "@/lib/claims";

// The founder's call, shown on project cards. "Raising" links to Vibestarter.
export function DecisionBadge({ decision }: { decision: Decision }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs " +
    (decision === "raise" ? "border-signal/50 text-signal hover:bg-signal/10" : "border-line text-ink");

  const content = (
    <>
      <span aria-hidden>●</span> Founder: {DECISIONS[decision].label}
      {decision === "raise" && <span aria-hidden>↗</span>}
    </>
  );

  return decision === "raise" ? (
    <a href={VIBESTARTER_URL} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}
