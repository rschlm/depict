"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoleculeCard } from "./MoleculeCard";
import type { MoleculeData } from "@/store/useChemStore";
import type { DepictorOptions } from "openchemlib";

interface SortableMoleculeCardProps {
  molecule: MoleculeData;
  displayOptions?: DepictorOptions;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
  structureWidth?: number;
  structureHeight?: number;
  cardWidth?: number;
  onCardClick?: () => void;
  onMoleculeHover?: (molecule: MoleculeData | null) => void;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
}

export function SortableMoleculeCard(props: SortableMoleculeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.molecule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging && { position: "relative" as const, zIndex: 9999 }),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`h-full cursor-grab active:cursor-grabbing select-none ${isDragging ? "opacity-50" : ""}`}
    >
      <MoleculeCard {...props} />
    </div>
  );
}
