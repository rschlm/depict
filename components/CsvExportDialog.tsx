"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CSV_COLUMNS,
  exportAllAsCSV,
  type CsvColumnKey,
  type ExportProperties,
} from "@/utils/downloadUtils";

interface CsvExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  molecules: Array<{ id: string; smiles: string; properties: ExportProperties; isReaction: boolean; reactionMeta?: import("@/utils/chemUtils").ReactionMetadata; name?: string; tags?: string[] }>;
  filename?: string;
}

const DEFAULT_COLUMNS: CsvColumnKey[] = CSV_COLUMNS.map((c) => c.key);

export function CsvExportDialog({
  open,
  onOpenChange,
  molecules,
  filename,
}: CsvExportDialogProps) {
  const [selected, setSelected] = useState<Set<CsvColumnKey>>(
    () => new Set(DEFAULT_COLUMNS)
  );

  const handleOpenChange = (next: boolean) => {
    if (next) setSelected(new Set(DEFAULT_COLUMNS));
    onOpenChange(next);
  };

  const toggle = (key: CsvColumnKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    const cols = Array.from(selected) as CsvColumnKey[];
    if (cols.length === 0) return;
    exportAllAsCSV(molecules, filename, cols);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose CSV columns</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {CSV_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="flex items-center space-x-2"
            >
              <Checkbox
                id={col.key}
                checked={selected.has(col.key)}
                onCheckedChange={() => toggle(col.key)}
              />
              <Label
                htmlFor={col.key}
                className="text-sm font-normal cursor-pointer"
              >
                {col.label}
              </Label>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={selected.size === 0}>
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
