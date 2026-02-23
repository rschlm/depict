"use client";

import { useRef, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChemDepict } from "./ChemDepict";
import { CompareBar } from "./CompareBar";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { useChemStore } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";
import { isReactionSmiles } from "@/utils/chemUtils";
import type { MoleculeData } from "@/store/useChemStore";
import type { MoleculeProperty } from "@/utils/chemUtils";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  ArrowRight,
} from "lucide-react";
import HexagonTwoTone from "@mui/icons-material/HexagonTwoTone";

interface ColumnDef {
  key: string;
  label: string;
  propKey?: keyof MoleculeProperty;
  align?: "left" | "right";
  className?: string;
  format?: (val: number) => string;
}

const COLUMNS: ColumnDef[] = [
  { key: "type", label: "Type", className: "w-[52px]" },
  { key: "structure", label: "Structure", className: "w-[80px]" },
  { key: "smiles", label: "SMILES" },
  { key: "name", label: "Name", className: "w-[120px]" },
  { key: "mw", label: "MW", propKey: "mw", align: "right", className: "w-[76px]", format: (v) => v.toFixed(1) },
  { key: "logP", label: "LogP", propKey: "logP", align: "right", className: "w-[66px]", format: (v) => v.toFixed(2) },
  { key: "logS", label: "LogS", propKey: "logS", align: "right", className: "w-[66px]", format: (v) => v.toFixed(2) },
  { key: "tpsa", label: "TPSA", propKey: "tpsa", align: "right", className: "w-[66px]", format: (v) => v.toFixed(1) },
  { key: "rotatableBonds", label: "Rot.", propKey: "rotatableBonds", align: "right", className: "w-[48px]" },
  { key: "donorCount", label: "HBD", propKey: "donorCount", align: "right", className: "w-[48px]" },
  { key: "acceptorCount", label: "HBA", propKey: "acceptorCount", align: "right", className: "w-[48px]" },
  { key: "stereoCenterCount", label: "Stereo", propKey: "stereoCenterCount", align: "right", className: "w-[52px]" },
  { key: "ro5Violations", label: "Ro5", propKey: "ro5Violations", align: "right", className: "w-[44px]" },
];

const ROW_HEIGHT = 52;

interface MoleculeTableProps {
  molecules: MoleculeData[];
  displayOptions?: DepictorOptions;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onMoleculeClick?: (molecule: MoleculeData) => void;
  onFindSimilar?: (molecule: MoleculeData) => void;
}

type SortKey = string;

export function MoleculeTable({
  molecules,
  displayOptions,
  selectedIds = new Set(),
  onSelectionChange,
  onMoleculeClick,
}: MoleculeTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { sortBy, sortOrder, setSort, similarityScores, reactionArrowStyle } = useChemStore();

  const sortedMolecules = useMemo(() => {
    if (sortBy === "input") return [...molecules];
    if (sortBy === "similarity") {
      return [...molecules].sort((a, b) => {
        const sa = similarityScores[a.id] ?? 0;
        const sb = similarityScores[b.id] ?? 0;
        return sortOrder === "asc" ? sa - sb : sb - sa;
      });
    }
    const rxnKeys = ["stepCount", "atomEconomy", "numComponents"] as const;
    if (rxnKeys.includes(sortBy as (typeof rxnKeys)[number])) {
      return [...molecules].sort((a, b) => {
        let va: number | null = null;
        let vb: number | null = null;
        const rm = a.reactionMeta;
        const rb = b.reactionMeta;
        if (sortBy === "stepCount") { va = rm?.numSteps ?? null; vb = rb?.numSteps ?? null; }
        else if (sortBy === "atomEconomy") { va = rm?.atomEconomy ?? null; vb = rb?.atomEconomy ?? null; }
        else if (sortBy === "numComponents") { va = rm ? rm.numReactants + rm.numProducts + rm.numAgents : null; vb = rb ? rb.numReactants + rb.numProducts + rb.numAgents : null; }
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return sortOrder === "asc" ? va - vb : vb - va;
      });
    }
    const key = sortBy as keyof MoleculeProperty;
    return [...molecules].sort((a, b) => {
      const va = a.properties?.[key] as number | undefined;
      const vb = b.properties?.[key] as number | undefined;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return sortOrder === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [molecules, sortBy, sortOrder, similarityScores]);

  const rowVirtualizer = useVirtualizer({
    count: sortedMolecules.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const handleHeaderClick = useCallback(
    (colKey: string) => {
      const col = COLUMNS.find((c) => c.key === colKey);
      if (!col?.propKey && colKey !== "mw" && colKey !== "input") return;
      const targetKey = col?.propKey ?? colKey;
      if (sortBy === targetKey) {
        setSort(sortBy, sortOrder === "asc" ? "desc" : "asc");
      } else {
        setSort(targetKey as SortKey as typeof sortBy, "asc");
      }
    },
    [sortBy, sortOrder, setSort]
  );

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    if (selectedIds.size === sortedMolecules.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sortedMolecules.map((m) => m.id)));
    }
  }, [selectedIds.size, sortedMolecules, onSelectionChange]);

  const handleRowSelect = useCallback(
    (mol: MoleculeData) => {
      if (!onSelectionChange) return;
      const next = new Set(selectedIds);
      if (next.has(mol.id)) next.delete(mol.id);
      else next.add(mol.id);
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange]
  );

  const allSelected =
    sortedMolecules.length > 0 &&
    selectedIds.size === sortedMolecules.length;

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? totalSize - virtualItems[virtualItems.length - 1].end
      : 0;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 w-full overflow-auto rounded-xl border border-border/40 bg-card"
      >
        <table className="w-full caption-bottom text-sm">
          <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b border-border/40">
            <tr>
              <th className="text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap w-[36px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-3.5 w-3.5"
                />
              </th>
              {COLUMNS.map((col) => {
                const isSorted = col.propKey ? sortBy === col.propKey : false;
                const sortable = !!col.propKey;
                return (
                  <th
                    key={col.key}
                    className={`text-foreground h-10 px-2 align-middle font-medium whitespace-nowrap text-[11px] ${col.className ?? ""} ${col.align === "right" ? "text-right" : "text-left"} ${sortable ? "cursor-pointer select-none hover:bg-muted/60 transition-colors" : ""}`}
                    onClick={() => sortable && handleHeaderClick(col.key)}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.align === "right" ? "justify-end w-full" : ""}`}>
                      {col.label}
                      {sortable &&
                        (isSorted ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-30 shrink-0" />
                        ))}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: paddingTop }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const mol = sortedMolecules[virtualRow.index];
              if (!mol) return null;
              const isSelected = selectedIds.has(mol.id);
              const props = mol.properties;
              const isReaction = isReactionSmiles(mol.smiles);

              return (
                <tr
                  key={mol.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer border-b border-border/20 transition-colors hover:bg-muted/40 data-[state=selected]:bg-primary/5"
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onMoleculeClick?.(mol)}
                >
                  {/* Checkbox */}
                  <td
                    className="p-2 align-middle whitespace-nowrap w-[36px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowSelect(mol);
                    }}
                  >
                    <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                  </td>

                  {/* Type badge */}
                  <td className="p-2 align-middle whitespace-nowrap px-1">
                    {isReaction ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-[18px] gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                        Rxn
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-[18px] gap-1 border-primary/30 text-primary bg-primary/5"
                      >
                        <HexagonTwoTone style={{ transform: "rotate(90deg)", fontSize: "10px" }} />
                        Mol
                      </Badge>
                    )}
                  </td>

                  {/* Structure thumbnail */}
                  <td className="p-2 align-middle whitespace-nowrap px-1">
                    <div className="flex items-center justify-center overflow-hidden">
                      {isReaction ? (
                        <ChemDepict
                          smiles={mol.smiles}
                          width={72}
                          height={40}
                          displayOptions={displayOptions}
                          arrowStyle={reactionArrowStyle}
                        />
                      ) : (
                        <ChemDepict
                          smiles={mol.smiles}
                          width={56}
                          height={40}
                          displayOptions={displayOptions}
                        />
                      )}
                    </div>
                  </td>

                  {/* SMILES */}
                  <td className="p-2 align-middle whitespace-nowrap px-2 max-w-0">
                    <span className="block truncate font-mono text-[11px] text-foreground/80" title={mol.smiles}>
                      {mol.smiles}
                    </span>
                  </td>

                  {/* Name */}
                  <td className="p-2 align-middle whitespace-nowrap px-2">
                    <span className="block truncate text-[11px]">
                      {mol.name || <span className="text-muted-foreground/30">&mdash;</span>}
                    </span>
                  </td>

                  {/* Property columns */}
                  {COLUMNS.slice(4).map((col) => {
                    const val = props?.[col.propKey!];
                    const isRo5 = col.key === "ro5Violations";
                    return (
                      <td
                        key={col.key}
                        className={`p-2 align-middle whitespace-nowrap tabular-nums text-[11px] ${col.align === "right" ? "text-right" : ""} ${
                          val == null
                            ? "text-muted-foreground/30"
                            : isRo5 && (val as number) === 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isRo5 && (val as number) >= 2
                                ? "text-destructive"
                                : "text-foreground/80"
                        }`}
                      >
                        {val != null
                          ? col.format
                            ? col.format(val as number)
                            : String(val)
                          : "\u2014"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: paddingBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CompareBar displayOptions={displayOptions} />
    </div>
  );
}
