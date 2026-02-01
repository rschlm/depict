"use client";

import { Download, Pin, X, FileText, FileCode, Table2, SlidersHorizontal, Image, CheckSquare, Square } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { exportAllAsSDF, exportAllAsCSV, exportAllAsSMI, CSV_COLUMNS, generateFilenameFromSmiles } from "@/utils/downloadUtils";
import { generateSVG } from "@/hooks/useCachedSVG";
import type { MoleculeData } from "@/store/useChemStore";
import type { DepictorOptions } from "openchemlib";
import type { ReactionArrowStyle } from "@/store/useChemStore";

interface SelectionToolbarProps {
  selectedMolecules: MoleculeData[];
  allDisplayedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onAddToComparator: (molecules: MoleculeData[]) => void;
  onOpenCsvColumnPicker?: (molecules: MoleculeData[]) => void;
  displayOptions?: DepictorOptions;
  reactionArrowStyle?: ReactionArrowStyle;
}

export function SelectionToolbar({
  selectedMolecules,
  allDisplayedCount,
  onSelectAll,
  onClearSelection,
  onAddToComparator,
  onOpenCsvColumnPicker,
  displayOptions,
  reactionArrowStyle = "forward",
}: SelectionToolbarProps) {
  const count = selectedMolecules.length;
  const allSelected = count > 0 && count >= allDisplayedCount;
  const moleculeCount = selectedMolecules.filter((m) => m.mol !== null).length;
  const reactionCount = selectedMolecules.filter((m) => m.mol === null).length;

  const countLabel =
    moleculeCount > 0 && reactionCount > 0
      ? `${count} selected (${moleculeCount} molecule${moleculeCount === 1 ? "" : "s"}, ${reactionCount} reaction${reactionCount === 1 ? "" : "s"})`
      : moleculeCount > 0
        ? `${moleculeCount} molecule${moleculeCount === 1 ? "" : "s"} selected`
        : `${reactionCount} reaction${reactionCount === 1 ? "" : "s"} selected`;

  const handleExportSDF = () => {
    exportAllAsSDF(selectedMolecules, `export_selected_${new Date().getTime()}.sdf`);
  };

  const handleExportSMI = () => {
    exportAllAsSMI(selectedMolecules, `export_selected_${new Date().getTime()}.smi`);
  };

  const handleExportCSV = () => {
    exportAllAsCSV(selectedMolecules, `export_selected_${new Date().getTime()}.csv`);
  };

  const handleExportSVGZip = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const w = 220;
    const h = 160;
    for (const m of selectedMolecules) {
      const svg = generateSVG(m.smiles, w, h, displayOptions ?? {}, reactionArrowStyle);
      if (svg) {
        const name = generateFilenameFromSmiles(m.smiles, "svg");
        zip.file(name, svg);
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export_selected_${new Date().getTime()}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddToComparator = () => {
    onAddToComparator(selectedMolecules.slice(0, 2));
  };

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-primary/5 border border-primary/20 rounded-md">
      <span className="text-sm font-medium text-foreground">
        {countLabel}
      </span>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onSelectAll}
              disabled={allSelected || allDisplayedCount === 0}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Select all
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Select all {allDisplayedCount} molecule{allDisplayedCount === 1 ? "" : "s"} in view</span>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={onClearSelection}
              disabled={count === 0}
            >
              <Square className="w-3.5 h-3.5" />
              Deselect all
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Clear selection</span>
          </TooltipContent>
        </Tooltip>
        <div className="w-px h-5 bg-border/50" />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5" />
                  Export selected
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="text-xs">Export selected molecules</span>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleExportSDF}>
              <FileText className="w-3.5 h-3.5 mr-2 shrink-0" />
              Export as SDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportSMI}>
              <FileCode className="w-3.5 h-3.5 mr-2 shrink-0" />
              Export as SMI
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportCSV}
              title={`Columns: ${CSV_COLUMNS.map((c) => c.key).join(", ")}`}
            >
              <Table2 className="w-3.5 h-3.5 mr-2 shrink-0" />
              Export as CSV
            </DropdownMenuItem>
            {onOpenCsvColumnPicker && (
              <DropdownMenuItem
                onClick={() => onOpenCsvColumnPicker(selectedMolecules)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2 shrink-0" />
                Export as CSV (choose columns)
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleExportSVGZip}>
              <Image className="w-3.5 h-3.5 mr-2 shrink-0" aria-hidden />
              Export as SVG (ZIP)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAddToComparator}
            >
              <Pin className="w-3.5 h-3.5" />
              Add to comparator
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">
              {count >= 2
                ? "Pin first 2 selected to comparator"
                : "Pin selected to comparator"}
            </span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClearSelection}
              disabled={count === 0}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <span className="text-xs">Clear selection</span>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
