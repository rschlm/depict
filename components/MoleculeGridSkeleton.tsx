"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { MoleculeCardSkeleton } from "./MoleculeCardSkeleton";
import { useChemStore } from "@/store/useChemStore";
import { MOLECULE_CARD, MIN_CARD_WIDTH, getCardDimensionsFromCardsPerRow } from "@/constants/ui";

interface MoleculeGridSkeletonProps {
  count: number;
  className?: string;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
}

/** Renders a grid of skeleton cards matching MoleculeGrid layout. */
export function MoleculeGridSkeleton({
  count,
  className = "",
  hideActionButtons = false,
  hideProperties = false,
}: MoleculeGridSkeletonProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { cardsPerRow } = useChemStore();
  const [containerWidth, setContainerWidth] = useState(800);

  useLayoutEffect(() => {
    if (parentRef.current) {
      const updateWidth = () => {
        if (parentRef.current) {
          setContainerWidth(parentRef.current.offsetWidth);
        }
      };
      updateWidth();
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

  const minGap = MOLECULE_CARD.MIN_GAP;
  const { height: cardHeight, structureWidth, structureHeight, columns } =
    getCardDimensionsFromCardsPerRow(containerWidth, cardsPerRow, minGap);

  let adjustedCardHeight = cardHeight;
  if (hideActionButtons) adjustedCardHeight -= Math.round(36 * (cardHeight / MOLECULE_CARD.HEIGHT));
  if (hideProperties) adjustedCardHeight -= Math.round(28 * (cardHeight / MOLECULE_CARD.HEIGHT));

  const gap = minGap;
  const skeletonCount = Math.min(count, columns * 4); // Limit to ~4 rows for performance

  return (
    <div ref={parentRef} className={`w-full ${className}`}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(${MIN_CARD_WIDTH}px, 1fr))`,
          gap: `${gap}px`,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: `0 ${gap}px`,
        }}
      >
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} style={{ height: adjustedCardHeight }}>
            <MoleculeCardSkeleton
              structureWidth={structureWidth}
              structureHeight={structureHeight}
              hideActionButtons={hideActionButtons}
              hideProperties={hideProperties}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
