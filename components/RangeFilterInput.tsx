"use client";

import { useCallback } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

interface RangeFilterInputProps {
  label: string;
  unit?: string;
  min: string;
  max: string;
  onMinChange: (val: number | null) => void;
  onMaxChange: (val: number | null) => void;
  step?: number;
  dataBounds?: { min: number; max: number };
}

export function RangeFilterInput({
  label,
  unit,
  min,
  max,
  onMinChange,
  onMaxChange,
  step = 1,
  dataBounds,
}: RangeFilterInputProps) {
  const parseVal = useCallback(
    (v: string): number | null => {
      if (v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    },
    []
  );

  const hasSliderBounds =
    dataBounds && isFinite(dataBounds.min) && isFinite(dataBounds.max) && dataBounds.min < dataBounds.max;

  const sliderMin = dataBounds?.min ?? 0;
  const sliderMax = dataBounds?.max ?? 100;
  const sliderValue = [
    min ? Number(min) : sliderMin,
    max ? Number(max) : sliderMax,
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] font-medium text-foreground/80 truncate">
          {label}
        </label>
        {unit && (
          <span className="text-[9px] text-muted-foreground/60">{unit}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={min}
          onChange={(e) => onMinChange(parseVal(e.target.value))}
          placeholder="Min"
          step={step}
          className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
        />
        <span className="text-[10px] text-muted-foreground/60">&ndash;</span>
        <input
          type="number"
          value={max}
          onChange={(e) => onMaxChange(parseVal(e.target.value))}
          placeholder="Max"
          step={step}
          className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
        />
      </div>
      {hasSliderBounds && (
        <SliderPrimitive.Root
          className="relative flex items-center select-none touch-none w-full h-4"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={sliderValue}
          onValueChange={([lo, hi]) => {
            onMinChange(lo <= sliderMin ? null : lo);
            onMaxChange(hi >= sliderMax ? null : hi);
          }}
        >
          <SliderPrimitive.Track className="relative grow rounded-full h-[3px] bg-muted">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary/40" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
          <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" />
        </SliderPrimitive.Root>
      )}
    </div>
  );
}
