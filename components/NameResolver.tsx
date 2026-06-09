"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Sparkles, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveChemicalName, looksLikeChemicalName, type NameSource } from "@/utils/chemUtils";

type ResolveStatus = "loading" | "resolved" | "failed";
type ResolveState = { status: ResolveStatus; smiles?: string; source?: NameSource };

interface NameResolverProps {
  /** Entries that failed SMILES parsing (individual tokens, comma/newline already split). */
  invalidEntries: string[];
  /** Current raw editor value. */
  value: string;
  /** Apply a new editor value (routes through the input-history handler for Undo support). */
  onApply: (next: string) => void;
}

const MAX_CANDIDATES = 25;
const DEBOUNCE_MS = 600;

// Badge text shown for each resolution source.
const SOURCE_LABEL: Record<NameSource, string> = {
  OPSIN: "IUPAC",
  PubChem: "PubChem",
};

/**
 * Replace a standalone entry (comma/newline separated) with a replacement string,
 * preserving the surrounding separators and whitespace.
 */
function replaceEntry(input: string, name: string, replacement: string): string {
  return input
    .split("\n")
    .map((line) =>
      line
        .split(",")
        .map((part) => (part.trim() === name ? part.replace(part.trim(), replacement) : part))
        .join(",")
    )
    .join("\n");
}

export function NameResolver({ invalidEntries, value, onApply }: NameResolverProps) {
  const [resolutions, setResolutions] = useState<Record<string, ResolveState>>({});
  const requestedRef = useRef<Set<string>>(new Set());

  const candidates = useMemo(
    () => Array.from(new Set(invalidEntries.filter(looksLikeChemicalName))).slice(0, MAX_CANDIDATES),
    [invalidEntries]
  );

  // Debounced resolution: resolve SMILES for any new name-like candidate.
  useEffect(() => {
    if (candidates.length === 0) return;
    const timer = setTimeout(() => {
      const toFetch = candidates.filter((n) => !requestedRef.current.has(n));
      if (toFetch.length === 0) return;

      setResolutions((prev) => {
        const next = { ...prev };
        toFetch.forEach((n) => {
          next[n] = { status: "loading" };
        });
        return next;
      });

      toFetch.forEach((name) => {
        requestedRef.current.add(name);
        void resolveChemicalName(name).then((res) => {
          setResolutions((prev) => ({
            ...prev,
            [name]: res
              ? { status: "resolved", smiles: res.smiles, source: res.source }
              : { status: "failed" },
          }));
          // Allow a retry later if the lookup failed (e.g. transient network error).
          if (!res) requestedRef.current.delete(name);
        });
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [candidates]);

  const visible = useMemo(
    () => candidates.map((name) => ({ name, state: resolutions[name] })),
    [candidates, resolutions]
  );

  const resolvedCount = visible.filter((v) => v.state?.status === "resolved").length;

  if (candidates.length === 0) return null;

  const applyOne = (name: string, smiles: string) => {
    onApply(replaceEntry(value, name, smiles));
  };

  const applyAll = () => {
    let next = value;
    for (const { name, state } of visible) {
      if (state?.status === "resolved" && state.smiles) {
        next = replaceEntry(next, name, state.smiles);
      }
    }
    onApply(next);
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>
            {candidates.length === 1 ? "Looks like a chemical name" : `${candidates.length} possible names`}
            <span className="text-amber-700/60 dark:text-amber-400/60 font-normal"> — resolve to SMILES</span>
          </span>
        </div>
        {resolvedCount > 1 && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2 text-xs shrink-0 border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            onClick={applyAll}
          >
            <Check className="w-3 h-3 mr-1" />
            Accept all ({resolvedCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ name, state }) => (
          <div
            key={name}
            className="group flex items-center gap-1.5 rounded-md border border-border bg-background pl-2.5 pr-1 py-1 text-xs shadow-sm"
          >
            <span className="font-medium text-foreground max-w-[180px] truncate" title={name}>
              {name}
            </span>

            {state?.status === "loading" && (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground shrink-0" />
            )}

            {state?.status === "failed" && (
              <span className="text-muted-foreground/70 italic pr-1.5">not found</span>
            )}

            {state?.status === "resolved" && state.smiles && (
              <>
                {state.source && (
                  <span
                    className="rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0"
                    title={
                      state.source === "OPSIN"
                        ? "Parsed as an IUPAC name (OPSIN)"
                        : "Matched a name in PubChem"
                    }
                  >
                    {SOURCE_LABEL[state.source]}
                  </span>
                )}
                <span className="text-muted-foreground shrink-0">→</span>
                <code
                  className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 max-w-[180px] truncate"
                  title={state.smiles}
                >
                  {state.smiles}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                  onClick={() => applyOne(name, state.smiles!)}
                >
                  <Plus className="w-3 h-3 mr-0.5" />
                  Accept
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
