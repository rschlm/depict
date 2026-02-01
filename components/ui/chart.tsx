"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }
  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ReactNode;
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        data-chart={chartId}
        className={cn("w-full", className)}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});

ChartContainer.displayName = "ChartContainer";

const ChartTooltip = Tooltip;

type TooltipContentPayload = { name?: string; dataKey?: string; value?: unknown; color?: string; payload?: Record<string, unknown>; fill?: string }[];

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean;
    payload?: TooltipContentPayload;
    label?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      labelKey,
      nameKey,
    },
    ref
  ) => {
    void indicator;
    void labelKey;
    const { config } = useChart();

    if (!active || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = (nameKey || item?.name || item?.dataKey || "value") as string;
    const itemConfig = config[key];
    const label = !hideLabel && (itemConfig?.label ?? key);
    const raw = item?.value;
    const value =
      raw != null
        ? typeof raw === "number"
          ? raw % 1 === 0
            ? String(raw)
            : raw.toFixed(2)
          : String(raw)
        : null;
    const color = item?.color ?? item?.payload?.fill ?? itemConfig?.color;

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md border border-border/50 bg-background px-3 py-2 shadow-md",
          className
        )}
      >
        {label && (
          <div className="text-xs font-medium text-muted-foreground mb-1">
            {label}
          </div>
        )}
        <div className="flex items-center gap-2">
          {!hideIndicator && color && (
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: color as string }}
            />
          )}
          {value != null && (
            <span className="text-sm font-medium tabular-nums">{value}</span>
          )}
        </div>
      </div>
    );
  }
);

ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
