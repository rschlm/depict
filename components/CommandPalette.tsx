"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Command } from "cmdk";
import {
  Search,
  Pencil,
  Download,
  Printer,
  BarChart3,
  Sliders,
  Keyboard,
  ListOrdered,
  Scale,
  TestTube2,
  Crosshair,
  Droplets,
  RotateCw,
  Droplet,
  Target,
  Atom,
  Link2,
  Layers,
  Sun,
  Moon,
  Upload,
  X,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  TableProperties,
  FolderOpen,
  Save,
  ArrowRight,
} from "lucide-react";
import HexagonTwoTone from "@mui/icons-material/HexagonTwoTone";
import { useTheme } from "next-themes";
import { isReactionSmiles } from "@/utils/chemUtils";
import type { MoleculeData } from "@/store/useChemStore";

export type ViewMode = "grid" | "table";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  molecules: MoleculeData[];
  onMoleculeSelect?: (molecule: MoleculeData) => void;
  onAction?: (action: string) => void;
  onSort?: (sortBy: string, sortOrder?: "asc" | "desc") => void;
  onFilterPreset?: (preset: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  molecules,
  onMoleculeSelect,
  onAction,
  onSort,
  onFilterPreset,
  viewMode,
  onViewModeChange,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filteredMolecules = useMemo(() => {
    if (!search.trim()) return molecules.slice(0, 8);
    const q = search.toLowerCase();
    return molecules
      .filter(
        (m) =>
          m.smiles.toLowerCase().includes(q) ||
          m.name?.toLowerCase().includes(q) ||
          m.tags?.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 12);
  }, [molecules, search]);

  const runAction = useCallback(
    (action: string) => {
      onAction?.(action);
      onOpenChange(false);
    },
    [onAction, onOpenChange]
  );

  const runSort = useCallback(
    (sortBy: string, sortOrder?: "asc" | "desc") => {
      onSort?.(sortBy, sortOrder);
      onOpenChange(false);
    },
    [onSort, onOpenChange]
  );

  const runFilterPreset = useCallback(
    (preset: string) => {
      onFilterPreset?.(preset);
      onOpenChange(false);
    },
    [onFilterPreset, onOpenChange]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="absolute left-1/2 top-[min(20%,180px)] -translate-x-1/2 w-full max-w-[560px] px-4">
        <Command
          className="rounded-lg border border-border/60 bg-popover shadow-2xl overflow-hidden"
          shouldFilter={false}
          loop
        >
          <div className="flex items-center border-b border-border/40 px-3">
            <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search molecules, actions, sort..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 pl-2"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Command.List className="max-h-[min(400px,60vh)] overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {filteredMolecules.length > 0 && (
              <Command.Group
                heading={
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1">
                    Molecules &amp; Reactions
                  </span>
                }
              >
                {filteredMolecules.map((mol) => {
                  const isRxn = isReactionSmiles(mol.smiles);
                  return (
                    <Command.Item
                      key={mol.id}
                      value={`mol-${mol.id}-${mol.smiles}`}
                      onSelect={() => {
                        onMoleculeSelect?.(mol);
                        onOpenChange(false);
                      }}
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      {isRxn ? (
                        <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <HexagonTwoTone
                          style={{
                            transform: "rotate(90deg)",
                            fontSize: "14px",
                          }}
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs truncate">
                            {mol.name || mol.smiles.substring(0, 50)}
                          </span>
                          <span className={`text-[9px] font-medium px-1 py-px rounded shrink-0 ${isRxn ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"}`}>
                            {isRxn ? "RXN" : "MOL"}
                          </span>
                        </div>
                        {mol.name && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {mol.smiles.substring(0, 40)}
                          </span>
                        )}
                      </div>
                      {!isRxn && mol.properties?.mw != null && (
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {mol.properties.mw.toFixed(1)} g/mol
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            <Command.Group
              heading={
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1">
                  Actions
                </span>
              }
            >
              <Command.Item
                value="draw-molecule"
                onSelect={() => runAction("draw")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
                <span>Draw molecule (Ketcher)</span>
              </Command.Item>
              <Command.Item
                value="import-file"
                onSelect={() => runAction("import")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span>Import file (CSV / SDF)</span>
              </Command.Item>
              <Command.Item
                value="export-molecules"
                onSelect={() => runAction("export")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Export molecules</span>
              </Command.Item>
              <Command.Item
                value="save-project"
                onSelect={() => runAction("save-project")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Save className="w-4 h-4 text-muted-foreground" />
                <span>Save project</span>
              </Command.Item>
              <Command.Item
                value="open-project"
                onSelect={() => runAction("open-project")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span>Open project</span>
              </Command.Item>
              <Command.Item
                value="print-view"
                onSelect={() => runAction("print")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Printer className="w-4 h-4 text-muted-foreground" />
                <span>Print / Save as PDF</span>
              </Command.Item>
              <Command.Item
                value="share-link"
                onSelect={() => runAction("share")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Link2 className="w-4 h-4 text-muted-foreground" />
                <span>Copy share link</span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading={
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1">
                  View
                </span>
              }
            >
              <Command.Item
                value="view-grid"
                onSelect={() => {
                  onViewModeChange?.("grid");
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <span>Grid view</span>
                {viewMode === "grid" && (
                  <span className="ml-auto text-[10px] text-primary">Active</span>
                )}
              </Command.Item>
              <Command.Item
                value="view-table"
                onSelect={() => {
                  onViewModeChange?.("table");
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <TableProperties className="w-4 h-4 text-muted-foreground" />
                <span>Table view</span>
                {viewMode === "table" && (
                  <span className="ml-auto text-[10px] text-primary">Active</span>
                )}
              </Command.Item>
              <Command.Item
                value="toggle-property-filters"
                onSelect={() => runAction("toggle-filters")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Sliders className="w-4 h-4 text-muted-foreground" />
                <span>Toggle property filters</span>
              </Command.Item>
              <Command.Item
                value="toggle-charts"
                onSelect={() => runAction("toggle-charts")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                <span>Toggle property charts</span>
              </Command.Item>
              <Command.Item
                value="display-settings"
                onSelect={() => runAction("display-settings")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span>Display settings</span>
              </Command.Item>
              <Command.Item
                value="toggle-theme"
                onSelect={() => {
                  setTheme(resolvedTheme === "dark" ? "light" : "dark");
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
                <span>
                  Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
                </span>
              </Command.Item>
              <Command.Item
                value="keyboard-shortcuts"
                onSelect={() => runAction("shortcuts")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Keyboard className="w-4 h-4 text-muted-foreground" />
                <span>Keyboard shortcuts</span>
              </Command.Item>
            </Command.Group>

            <Command.Group
              heading={
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1">
                  Sort
                </span>
              }
            >
              {[
                { key: "input", label: "Input order", icon: ListOrdered },
                { key: "mw", label: "Molecular weight", icon: Scale },
                { key: "logP", label: "LogP", icon: TestTube2 },
                { key: "tpsa", label: "TPSA", icon: Crosshair },
                { key: "logS", label: "LogS", icon: Droplets },
                { key: "rotatableBonds", label: "Rotatable bonds", icon: RotateCw },
                { key: "donorCount", label: "H-bond donors", icon: Droplet },
                { key: "acceptorCount", label: "H-bond acceptors", icon: Target },
                { key: "stereoCenterCount", label: "Stereo centers", icon: Atom },
                { key: "stepCount", label: "Reaction step count", icon: ArrowRight },
                { key: "atomEconomy", label: "Atom economy", icon: Scale },
              ].map(({ key, label, icon: Icon }) => (
                <Command.Item
                  key={key}
                  value={`sort-${key}-${label}`}
                  onSelect={() => runSort(key)}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span>{label}</span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runSort(key, "asc");
                      }}
                      className="p-0.5 rounded hover:bg-muted"
                      title="Ascending"
                    >
                      <ArrowUp className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        runSort(key, "desc");
                      }}
                      className="p-0.5 rounded hover:bg-muted"
                      title="Descending"
                    >
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading={
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 px-1">
                  Filter presets
                </span>
              }
            >
              <Command.Item
                value="preset-lipinski"
                onSelect={() => runFilterPreset("lipinski")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span>Lipinski-compliant (Ro5)</span>
              </Command.Item>
              <Command.Item
                value="preset-leadlike"
                onSelect={() => runFilterPreset("leadlike")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span>Lead-like (MW 200-350, LogP -1-3)</span>
              </Command.Item>
              <Command.Item
                value="preset-fragment"
                onSelect={() => runFilterPreset("fragment")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
                <span>Fragment-like (MW &lt; 300, LogP &lt; 3)</span>
              </Command.Item>
              <Command.Item
                value="preset-atom-economical"
                onSelect={() => runFilterPreset("atom-economical")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <ArrowRight className="w-4 h-4 text-amber-500" />
                <span>Atom-economical reactions (AE &gt; 80%)</span>
              </Command.Item>
              <Command.Item
                value="preset-balanced"
                onSelect={() => runFilterPreset("balanced")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <ArrowRight className="w-4 h-4 text-amber-500" />
                <span>Balanced reactions</span>
              </Command.Item>
              <Command.Item
                value="preset-clear-filters"
                onSelect={() => runFilterPreset("clear")}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <X className="w-4 h-4 text-muted-foreground" />
                <span>Clear all filters</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border/40 px-3 py-2 flex items-center gap-4 text-[10px] text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-muted/60 border border-border/40 font-mono text-[10px]">
                esc
              </kbd>
              Close
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
