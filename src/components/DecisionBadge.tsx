import { DECISIONS, VIBESTARTER_APPLY_URL, type Decision } from "@/lib/claims";

// The founder's call, shown on project cards. "Raising" links to the
// Vibestarter application when NEXT_PUBLIC_VIBESTARTER_APPLY_URL is set.
export function DecisionBadge({ decision }: { decision: Decision }) {
  const link = decision === "raise" ? VIBESTARTER_APPLY_URL : null;
  const className =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs " +
    (decision === "raise" ? "border-signal/50 text-signal" : "border-line text-ink") +
    (link ? " hover:bg-signal/10" : "");

  const content = (
    <>
      <span aria-hidden>●</span> Founder: {DECISIONS[decision].label}
      {link && <span aria-hidden>↗</span>}
    </>
  );

  return link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}
