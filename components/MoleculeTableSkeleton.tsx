"use client";

import { Skeleton } from "./ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const HEADER_LABELS = [
  "Type",
  "Structure",
  "SMILES",
  "Name",
  "MW",
  "LogP",
  "LogS",
  "TPSA",
  "Rot.",
  "HBD",
  "HBA",
  "Stereo",
  "Ro5",
];

interface MoleculeTableSkeletonProps {
  rows?: number;
}

export function MoleculeTableSkeleton({ rows = 12 }: MoleculeTableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden rounded-md border border-border/40">
      <Table>
        <TableHeader className="bg-muted/60">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[36px] px-1">
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            </TableHead>
            {HEADER_LABELS.map((label) => (
              <TableHead key={label} className="text-[11px] font-medium">
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent" style={{ height: 52 }}>
              <TableCell className="w-[36px] px-1">
                <Skeleton className="h-3.5 w-3.5 rounded-sm" />
              </TableCell>
              {/* Type */}
              <TableCell className="px-1">
                <Skeleton className="h-[18px] w-10 rounded-full" />
              </TableCell>
              {/* Structure */}
              <TableCell className="px-1">
                <Skeleton className="h-8 w-14 rounded" />
              </TableCell>
              {/* SMILES */}
              <TableCell className="px-2">
                <Skeleton className="h-3.5 rounded" style={{ width: `${55 + (i % 4) * 10}%` }} />
              </TableCell>
              {/* Name */}
              <TableCell className="px-2">
                <Skeleton className="h-3.5 w-16 rounded" />
              </TableCell>
              {/* MW through Ro5 — 9 numeric property columns */}
              {Array.from({ length: 9 }).map((_, j) => (
                <TableCell key={j} className="px-2 text-right">
                  <Skeleton className="h-3.5 w-8 rounded ml-auto" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
