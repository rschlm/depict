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
import { motion, AnimatePresence } from "motion/react";
import { MoleculeCard } from "./MoleculeCard";
import { SortableMoleculeCard } from "./SortableMoleculeCard";
import { CompareBar } from "./CompareBar";
import { useChemStore } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";
import { MOLECULE_CARD, VIRTUALIZATION, MIN_CARD_WIDTH, getCardDimensionsFromCardsPerRow } from "@/constants/ui";
import type { MoleculeData } from "@/store/useChemStore";
import type { MoleculeProperty } from "@/utils/chemUtils";

const SORT_KEYS = ["mw", "logP", "tpsa", "logS", "rotatableBonds", "donorCount", "acceptorCount", "stereoCenterCount", "stepCount", "atomEconomy", "numComponents"] as const;
type SortKey = (typeof SORT_KEYS)[number];
void SORT_KEYS;

function getSortValue(m: MoleculeData, key: SortKey): number | null {
  if (key === "stepCount") return m.reactionMeta?.numSteps ?? null;
  if (key === "atomEconomy") return m.reactionMeta?.atomEconomy ?? null;
  if (key === "numComponents") {
    const rm = m.reactionMeta;
    return rm ? rm.numReactants + rm.numProducts + rm.numAgents : null;
  }
  const p = m.properties as MoleculeProperty | null | undefined;
  if (!p) return null;
  const v = (p as unknown as Record<string, number>)[key];
  return typeof v === "number" ? v : null;
}

interface MoleculeGridProps {
  className?: string;
  molecules?: MoleculeData[];
  displayOptions?: DepictorOptions;
  onMoleculeClick?: (molecule: MoleculeData) => void;
  onMoleculeHover?: (molecule: MoleculeData | null) => void;
  onFindSimilar?: (molecule: MoleculeData) => void;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  lastClickedIndex?: number | null;
  onLastClickedIndexChange?: (index: number | null) => void;
  onReorder?: (reordered: MoleculeData[]) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i, 20) * 0.03, duration: 0.25, ease: [0, 0, 0.2, 1] as const },
  }),
};

export function MoleculeGrid({ className = "", molecules: moleculesProp, displayOptions, onMoleculeClick, onMoleculeHover, onFindSimilar, hideActionButtons = false, hideProperties = false, selectedIds = new Set(), onSelectionChange, lastClickedIndex = null, onLastClickedIndexChange, onReorder }: MoleculeGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { filteredMolecules, cardsPerRow, sortBy, sortOrder, similarityScores } = useChemStore();
  const molecules = moleculesProp ?? filteredMolecules;

  const sortedMolecules = useMemo(() => {
    if (sortBy === "input") return [...molecules];
    if (sortBy === "similarity") {
      const list = [...molecules];
      return list.sort((a, b) => {
        const sa = similarityScores[a.id] ?? 0;
        const sb = similarityScores[b.id] ?? 0;
        return sortOrder === "asc" ? sa - sb : sb - sa;
      });
    }
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
  }, [molecules, sortBy, sortOrder, similarityScores]);

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

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const total = sortedMolecules.length;
      if (total === 0) return;

      let next = focusedIndex;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          next = Math.min(focusedIndex + 1, total - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          next = Math.max(focusedIndex - 1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          next = Math.min(focusedIndex + columns, total - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          next = Math.max(focusedIndex - columns, 0);
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < total) {
            onMoleculeClick?.(sortedMolecules[focusedIndex]);
          }
          return;
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < total && onSelectionChange) {
            const id = sortedMolecules[focusedIndex].id;
            const newIds = new Set(selectedIds);
            if (newIds.has(id)) newIds.delete(id);
            else newIds.add(id);
            onSelectionChange(newIds);
          }
          return;
        case "p":
        case "P":
          if (focusedIndex >= 0 && focusedIndex < total) {
            const mol = sortedMolecules[focusedIndex];
            const { pinnedMolecules, pinMolecule, unpinMolecule } = useChemStore.getState();
            if (pinnedMolecules.some((m) => m.id === mol.id)) {
              unpinMolecule(mol.id);
            } else {
              pinMolecule(mol);
            }
          }
          return;
        case "Escape":
          setFocusedIndex(-1);
          gridContainerRef.current?.blur();
          return;
        default:
          return;
      }
      if (next !== focusedIndex) {
        setFocusedIndex(next);
        const rowIndex = Math.floor(next / columns);
        rowVirtualizer.scrollToIndex(rowIndex, { align: "auto" });
      }
    },
    [focusedIndex, sortedMolecules, columns, onMoleculeClick, onSelectionChange, selectedIds, rowVirtualizer]
  );

  const isSortable = sortBy === "input" && onReorder != null;

  // Sortable grid: render all cards (no virtualization) when sort is input
  if (isSortable) {
    const totalHeight = rowCount * (adjustedCardHeight + gap) - gap;
    return (
      <div
        ref={(el) => {
          (parentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          (gridContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        className={`w-full outline-none ${className}`}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
      >
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
                <motion.div
                  key={molecule.id}
                  style={{ height: adjustedCardHeight }}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className={focusedIndex === index ? "ring-2 ring-primary/50 rounded-md" : ""}
                >
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
                    onFindSimilar={onFindSimilar}
                    similarityScore={similarityScores[molecule.id] ?? null}
                  />
                </motion.div>
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
      ref={(el) => {
        (parentRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        (gridContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }}
      className={`w-full outline-none ${className}`}
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
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
                    <motion.div
                      key={molecule.id}
                      custom={colIndex}
                      initial="hidden"
                      animate="visible"
                      variants={cardVariants}
                      className={focusedIndex === index ? "ring-2 ring-primary/50 rounded-md" : ""}
                    >
                    <MoleculeCard
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
                      onFindSimilar={onFindSimilar}
                      similarityScore={similarityScores[molecule.id] ?? null}
                    />
                    </motion.div>
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
