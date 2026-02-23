"use client";

import { useMemo } from "react";
import { Sliders } from "lucide-react";
import { Button } from "./ui/button";
import { RangeFilterInput } from "./RangeFilterInput";
import type { MoleculeData } from "@/store/useChemStore";
import type { MoleculeProperty } from "@/utils/chemUtils";

interface FilterDef {
  key: string;
  label: string;
  unit?: string;
  propKey: keyof MoleculeProperty;
  step: number;
  minKey: string;
  maxKey: string;
}

const PROPERTY_FILTER_DEFS: FilterDef[] = [
  { key: "mw", label: "MW", unit: "g/mol", propKey: "mw", step: 1, minKey: "mwMin", maxKey: "mwMax" },
  { key: "logP", label: "LogP", propKey: "logP", step: 0.1, minKey: "logPMin", maxKey: "logPMax" },
  { key: "logS", label: "LogS", propKey: "logS", step: 0.1, minKey: "logSMin", maxKey: "logSMax" },
  { key: "tpsa", label: "TPSA", unit: "\u00c5\u00b2", propKey: "tpsa", step: 1, minKey: "tpsaMin", maxKey: "tpsaMax" },
  { key: "rotatableBonds", label: "Rot. bonds", propKey: "rotatableBonds", step: 1, minKey: "rotatableBondsMin", maxKey: "rotatableBondsMax" },
  { key: "donorCount", label: "HBD", propKey: "donorCount", step: 1, minKey: "donorCountMin", maxKey: "donorCountMax" },
  { key: "acceptorCount", label: "HBA", propKey: "acceptorCount", step: 1, minKey: "acceptorCountMin", maxKey: "acceptorCountMax" },
  { key: "stereoCenterCount", label: "Stereo", propKey: "stereoCenterCount", step: 1, minKey: "stereoCenterCountMin", maxKey: "stereoCenterCountMax" },
];

interface PropertyFiltersGridProps {
  values: Record<string, string>;
  onFilterChange: (updates: Record<string, number | null>) => void;
  onClearAll: () => void;
  molecules: MoleculeData[];
}

export function PropertyFiltersGrid({
  values,
  onFilterChange,
  onClearAll,
  molecules,
}: PropertyFiltersGridProps) {
  const dataBoundsMap = useMemo(() => {
    const bounds: Record<string, { min: number; max: number }> = {};
    for (const def of PROPERTY_FILTER_DEFS) {
      let lo = Infinity;
      let hi = -Infinity;
      for (const m of molecules) {
        const v = m.properties?.[def.propKey];
        if (typeof v === "number") {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      if (isFinite(lo) && isFinite(hi)) {
        bounds[def.key] = { min: Math.floor(lo * 10) / 10, max: Math.ceil(hi * 10) / 10 };
      }
    }
    return bounds;
  }, [molecules]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 p-4 bg-background/60 backdrop-blur-sm border border-border/40 rounded-md shadow-sm">
      <div className="col-span-full flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sliders className="w-3.5 h-3.5" />
          <span>Property Filters</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Clear All
        </Button>
      </div>

      {PROPERTY_FILTER_DEFS.map((def) => (
        <RangeFilterInput
          key={def.key}
          label={def.label}
          unit={def.unit}
          min={values[def.minKey] ?? ""}
          max={values[def.maxKey] ?? ""}
          step={def.step}
          dataBounds={dataBoundsMap[def.key]}
          onMinChange={(v) => onFilterChange({ [def.minKey]: v })}
          onMaxChange={(v) => onFilterChange({ [def.maxKey]: v })}
        />
      ))}
    </div>
  );
}
