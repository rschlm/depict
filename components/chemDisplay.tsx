import { ShieldCheck, ShieldAlert, ShieldX, type LucideIcon } from "lucide-react";

/** Render a molecular formula with subscripted digit runs (e.g. C6H12O6). */
export function FormulaDisplay({ formula, className }: { formula: string; className?: string }) {
  // Split keeps the digit groups; render numeric chunks as <sub> — no innerHTML needed.
  const parts = formula.split(/(\d+)/);
  return (
    <span className={className}>
      {parts.map((p, i) => (/^\d+$/.test(p) ? <sub key={i}>{p}</sub> : p))}
    </span>
  );
}

export interface Ro5Styling {
  bg: string;
  text: string;
  Icon: LucideIcon;
  label: string;
}

/** Tailwind classes + icon + tooltip label for a Lipinski Rule-of-5 violation count. */
export function getRo5Styling(violations: number): Ro5Styling {
  if (violations === 0) {
    return { bg: "bg-emerald-500/10", text: "text-emerald-500", Icon: ShieldCheck, label: "Passes Lipinski Rule of 5" };
  }
  if (violations === 1) {
    return { bg: "bg-amber-500/10", text: "text-amber-500", Icon: ShieldAlert, label: "1 Ro5 violation" };
  }
  return { bg: "bg-red-500/10", text: "text-red-500", Icon: ShieldX, label: `${violations} Ro5 violations` };
}
