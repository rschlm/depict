"use client";

import { useEffect } from "react";
import { useCachedSVG } from "@/hooks/useCachedSVG";
import { DepictorOptions } from "openchemlib";
import { ReactionArrowStyle } from "@/store/useChemStore";

interface ChemDepictProps {
  smiles: string;
  width?: number;
  height?: number;
  className?: string;
  displayOptions?: DepictorOptions;
  arrowStyle?: ReactionArrowStyle;
  onSVGGenerated?: (svg: string) => void;
}

export function ChemDepict({
  smiles,
  width = 200,
  height = 200,
  className = "",
  displayOptions,
  arrowStyle = "forward",
  onSVGGenerated,
}: ChemDepictProps) {
  // Use cached SVG hook for performance
  const svgContent = useCachedSVG(smiles, width, height, displayOptions, arrowStyle);

  // Call the onSVGGenerated callback in useEffect to avoid updating parent during render
  useEffect(() => {
    if (svgContent && onSVGGenerated) {
      onSVGGenerated(svgContent);
    }
  }, [svgContent, onSVGGenerated]);

  if (!svgContent) {
    return (
      <div
        className={`flex items-center justify-center bg-muted/50 border border-border/40 rounded ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground/60 text-xs font-sans">—</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-foreground ${className}`}
      style={{ width, height }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}

