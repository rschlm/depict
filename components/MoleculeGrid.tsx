"use client";

import { useRef, useState, useLayoutEffect, useCallback, useMemo } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { MoleculeCard } from "./MoleculeCard";
import { SortableMoleculeCard } from "./SortableMoleculeCard";
import { CompareBar } from "./CompareBar";
import { useChemStore } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";
import { MOLECULE_CARD, VIRTUALIZATION, MIN_CARD_WIDTH, getCardDimensionsFromCardsPerRow } from "@/constants/ui";
import type { MoleculeData } from "@/store/useChemStore";
import type { MoleculeProperty } from "@/utils/chemUtils";

const SORT_KEYS = ["mw", "logP", "tpsa", "logS", "rotatableBonds", "donorCount", "acceptorCount", "stereoCenterCount"] as const;
type SortKey = (typeof SORT_KEYS)[number];
void SORT_KEYS; // Used for SortKey type

function getSortValue(m: MoleculeData, key: SortKey): number | null {
  const p = m.properties as MoleculeProperty | null | undefined;
  if (!p) return null;
  const v = (p as unknown as Record<string, number>)[key];
  return typeof v === "number" ? v : null;
}

interface MoleculeGridProps {
  className?: string;
  /** Molecules to display; defaults to store's filteredMolecules */
  molecules?: MoleculeData[];
  displayOptions?: DepictorOptions;
  onMoleculeClick?: (molecule: MoleculeData) => void;
  onMoleculeHover?: (molecule: MoleculeData | null) => void;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  lastClickedIndex?: number | null;
  onLastClickedIndexChange?: (index: number | null) => void;
  /** When sort is "input", called with reordered molecules to update SMILES input */
  onReorder?: (reordered: MoleculeData[]) => void;
}

export function MoleculeGrid({ className = "", molecules: moleculesProp, displayOptions, onMoleculeClick, onMoleculeHover, hideActionButtons = false, hideProperties = false, selectedIds = new Set(), onSelectionChange, lastClickedIndex = null, onLastClickedIndexChange, onReorder }: MoleculeGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { filteredMolecules, cardsPerRow, sortBy, sortOrder } = useChemStore();
  const molecules = moleculesProp ?? filteredMolecules;

  const sortedMolecules = useMemo(() => {
    if (sortBy === "input") return [...molecules];
    const key = sortBy as SortKey;
    const list = [...molecules];
    return list.sort((a, b) => {
      const va = getSortValue(a, key);
      const vb = getSortValue(b, key);
      if (va == null && vb == null) return 0;
      if (va == null) return sortOrder === "asc" ? 1 : -1;
      if (vb == null) return sortOrder === "asc" ? -1 : 1;
      const cmp = va - vb;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [molecules, sortBy, sortOrder]);

  const [startOffset, setStartOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    if (parentRef.current) {
      setStartOffset(parentRef.current.offsetTop);
      const updateWidth = () => {
        if (parentRef.current) {
          setContainerWidth(parentRef.current.offsetWidth);
        }
      };
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  const minGap = MOLECULE_CARD.MIN_GAP;
  const {
    width: cardWidth,
    height: cardHeight,
    structureWidth,
    structureHeight,
    columns,
  } = getCardDimensionsFromCardsPerRow(containerWidth || 800, cardsPerRow, minGap);

  // Calculate height based on what's hidden
  let adjustedCardHeight = cardHeight;
  if (hideActionButtons) adjustedCardHeight -= Math.round(36 * (cardHeight / MOLECULE_CARD.HEIGHT));
  if (hideProperties) adjustedCardHeight -= Math.round(28 * (cardHeight / MOLECULE_CARD.HEIGHT));

  const gap = minGap;

  // Calculate row count based on column count
  const rowCount = Math.ceil(sortedMolecules.length / columns);

  // Create virtualized rows using window scrolling
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => adjustedCardHeight + gap,
    overscan: VIRTUALIZATION.OVERSCAN_ROWS, // Increased for smoother scrolling
    scrollMargin: startOffset,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  const handleMoleculeClick = useCallback((molecule: MoleculeData) => {
    onMoleculeClick?.(molecule);
  }, [onMoleculeClick]);

  const handleMoleculeHover = useCallback((molecule: MoleculeData | null) => {
    onMoleculeHover?.(molecule);
  }, [onMoleculeHover]);

  const handleSelect = useCallback((molecule: MoleculeData, index: number, e: React.MouseEvent) => {
    if (!onSelectionChange) return;
    const id = molecule.id;
    const newIds = new Set(selectedIds);

    if (e.shiftKey && lastClickedIndex != null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      for (let i = start; i <= end; i++) {
        newIds.add(sortedMolecules[i].id);
      }
    } else {
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
    }

    onSelectionChange(newIds);
    onLastClickedIndexChange?.(index);
  }, [selectedIds, onSelectionChange, onLastClickedIndexChange, lastClickedIndex, sortedMolecules]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !onReorder) return;
      const oldIndex = sortedMolecules.findIndex((m) => m.id === active.id);
      const newIndex = sortedMolecules.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(sortedMolecules, oldIndex, newIndex);
      onReorder(reordered);
    },
    [sortedMolecules, onReorder]
  );

  const isSortable = sortBy === "input" && onReorder != null;

  // Sortable grid: render all cards (no virtualization) when sort is input
  if (isSortable) {
    const totalHeight = rowCount * (adjustedCardHeight + gap) - gap;
    return (
      <div ref={parentRef} className={`w-full ${className}`}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedMolecules.map((m) => m.id)} strategy={rectSortingStrategy}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columns}, minmax(${MIN_CARD_WIDTH}px, 1fr))`,
                gap: `${gap}px`,
                width: "100%",
                minHeight: `${totalHeight}px`,
                padding: `0 ${gap}px`,
              }}
            >
              {sortedMolecules.map((molecule, index) => (
                <div key={molecule.id} style={{ height: adjustedCardHeight }}>
                  <SortableMoleculeCard
                    molecule={molecule}
                    displayOptions={displayOptions}
                    hideActionButtons={hideActionButtons}
                    hideProperties={hideProperties}
                    structureWidth={structureWidth}
                    structureHeight={structureHeight}
                    cardWidth={cardWidth}
                    onCardClick={() => handleMoleculeClick(molecule)}
                    onMoleculeHover={handleMoleculeHover}
                    isSelected={selectedIds.has(molecule.id)}
                    onSelect={onSelectionChange ? (e) => handleSelect(molecule, index, e) : undefined}
                  />
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <CompareBar displayOptions={displayOptions} />
      </div>
    );
  }

  // Virtualized grid for non-input sort
  return (
    <div
      ref={parentRef}
      className={`w-full ${className}`}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualRows.map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const endIndex = Math.min(startIndex + columns, sortedMolecules.length);
          const rowMolecules = sortedMolecules.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columns}, minmax(${MIN_CARD_WIDTH}px, 1fr))`,
                  gap: `${gap}px`,
                  height: `${adjustedCardHeight}px`,
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  padding: `0 ${gap}px`,
                }}
              >
                {rowMolecules.map((molecule, colIndex) => {
                  const index = startIndex + colIndex;
                  return (
                    <MoleculeCard
                      key={molecule.id}
                      molecule={molecule}
                      displayOptions={displayOptions}
                      hideActionButtons={hideActionButtons}
                      hideProperties={hideProperties}
                      structureWidth={structureWidth}
                      structureHeight={structureHeight}
                      cardWidth={cardWidth}
                      onCardClick={() => handleMoleculeClick(molecule)}
                      onMoleculeHover={handleMoleculeHover}
                      isSelected={selectedIds.has(molecule.id)}
                      onSelect={onSelectionChange ? (e) => handleSelect(molecule, index, e) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare Bar */}
      <CompareBar displayOptions={displayOptions} />
    </div>
  );
}
