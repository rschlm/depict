"use client";

import { Skeleton } from "./ui/skeleton";

interface MoleculeCardSkeletonProps {
  structureWidth?: number;
  structureHeight?: number;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
}

export function MoleculeCardSkeleton({
  structureWidth = 187,
  structureHeight = 136,
  hideActionButtons = false,
  hideProperties = false,
}: MoleculeCardSkeletonProps) {
  return (
    <div className="flex flex-col h-full bg-card border border-border/60 rounded-md overflow-hidden">
      {/* Structure area */}
      <div className="p-4 bg-muted/20 min-h-0 flex-shrink">
        <Skeleton
          className="mx-auto"
          style={{
            width: structureWidth,
            height: structureHeight,
          }}
        />
      </div>

      {/* Footer - SMILES line + optional properties + optional actions */}
      <div className="flex flex-col flex-1 min-h-[100px] min-w-0 px-3 pt-2.5 pb-2.5 border-t border-border/60 bg-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Skeleton className="h-3 flex-1 max-w-[80%]" />
          <Skeleton className="h-5 w-5 shrink-0 rounded" />
        </div>

        {!hideProperties && (
          <div className="flex items-center gap-3 mb-2">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
        )}

        {!hideActionButtons && (
          <div className="flex items-center gap-1 mt-auto pt-1">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        )}
      </div>
    </div>
  );
}
