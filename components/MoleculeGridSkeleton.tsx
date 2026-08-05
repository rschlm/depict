"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { MoleculeCardSkeleton } from "./MoleculeCardSkeleton";
import { useChemStore } from "@/store/useChemStore";
import { MOLECULE_CARD, MIN_CARD_WIDTH, getCardDimensionsFromCardsPerRow, getHiddenRowsHeight } from "@/constants/ui";

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
    const el = parentRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update); // fallback: some environments don't deliver RO callbacks
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const minGap = MOLECULE_CARD.MIN_GAP;
  const { width: cardWidth, height: cardHeight, structureWidth, structureHeight, columns } =
    getCardDimensionsFromCardsPerRow(containerWidth, cardsPerRow, minGap);

  const adjustedCardHeight =
    cardHeight - getHiddenRowsHeight(cardWidth, hideActionButtons, hideProperties);

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
