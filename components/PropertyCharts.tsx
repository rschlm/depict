"use client";

import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts";
import { UMAP } from "umap-js";
import { MoleculeData } from "@/store/useChemStore";
import { MoleculeProperty } from "@/utils/chemUtils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { generateSVG } from "@/lib/svgGenerator";
import type { DepictorOptions } from "openchemlib";
import type { ReactionArrowStyle } from "@/store/useChemStore";

const UMAP_MAX_POINTS = 500;
const UMAP_FEATURE_KEYS: (keyof MoleculeProperty)[] = [
  "mw",
  "logP",
  "tpsa",
  "rotatableBonds",
  "donorCount",
  "acceptorCount",
  "stereoCenterCount",
];

const NUM_BINS = 10;

/** Distinct color for hovered molecule (red) so it stands out from blue chart bars */
const HOVER_HIGHLIGHT_COLOR = "hsl(0, 75%, 55%)";

function buildHistogram(
  values: number[],
  getBinLabel: (min: number, max: number) => string
): { bin: string; count: number; min: number; max: number }[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = range / NUM_BINS;
  const bins: { bin: string; count: number; min: number; max: number }[] = [];
  for (let i = 0; i < NUM_BINS; i++) {
    const binMin = min + i * step;
    const binMax = min + (i + 1) * step;
    const count = values.filter((v) => v >= binMin && (i === NUM_BINS - 1 ? v <= binMax : v < binMax)).length;
    bins.push({
      bin: getBinLabel(binMin, binMax),
      count,
      min: binMin,
      max: binMax,
    });
  }
  return bins;
}

function getBinIndex(
  value: number,
  bins: { min: number; max: number }[]
): number {
  for (let i = 0; i < bins.length; i++) {
    const { min, max } = bins[i];
    if (value >= min && (i === bins.length - 1 ? value <= max : value < max))
      return i;
  }
  return -1;
}

// Radar axes: normalize to 0–100 using dataset max (or sensible default)
const RADAR_KEYS: (keyof MoleculeProperty)[] = [
  "mw",
  "logP",
  "tpsa",
  "rotatableBonds",
  "donorCount",
  "acceptorCount",
  "stereoCenterCount",
];
const RADAR_LABELS: Record<string, string> = {
  mw: "MW",
  logP: "LogP",
  tpsa: "TPSA",
  rotatableBonds: "Rot. bonds",
  donorCount: "HBD",
  acceptorCount: "HBA",
  stereoCenterCount: "Stereo",
};
const RADAR_MAX: Record<string, number> = {
  mw: 800,
  logP: 8,
  tpsa: 150,
  rotatableBonds: 15,
  donorCount: 10,
  acceptorCount: 15,
  stereoCenterCount: 10,
};

function normalizeRadarValue(key: string, value: number): number {
  const max = RADAR_MAX[key] ?? 100;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

const TOOLTIP_SVG_SIZE = 48;

function HistogramBarTooltipContent({
  plotMolecules,
  property,
  data,
  displayOptions,
  reactionArrowStyle,
}: {
  plotMolecules: MoleculeData[];
  property: "mw" | "logP" | "tpsa";
  data: { bin: string; count: number; min: number; max: number }[];
  displayOptions?: DepictorOptions;
  reactionArrowStyle?: ReactionArrowStyle;
}) {
  const TooltipContent = (props: { active?: boolean; payload?: readonly { value?: number; payload?: { bin: string; count: number; min: number; max: number } }[] }) => {
    const { active, payload } = props;
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const inBin = plotMolecules.filter((m) => {
      const v = (m.properties as unknown as Record<string, number>)[property];
      if (v == null) return false;
      const idx = data.findIndex((d) => d.min === p.min && d.max === p.max);
      const last = idx === data.length - 1;
      return v >= p.min && (last ? v <= p.max : v < p.max);
    });
    const sample = inBin.slice(0, 3);
    return (
      <div className="rounded-md border border-border/50 bg-background px-2 py-1.5 shadow-md">
        <div className="flex items-center gap-2">
          {sample.map((m) => {
            const svg = generateSVG(m.smiles, TOOLTIP_SVG_SIZE, Math.round(TOOLTIP_SVG_SIZE * 0.75), displayOptions, reactionArrowStyle ?? "forward");
            return svg ? (
              <div key={m.id} className="shrink-0 rounded border border-border/40 overflow-hidden bg-muted" dangerouslySetInnerHTML={{ __html: svg }} style={{ width: TOOLTIP_SVG_SIZE, height: Math.round(TOOLTIP_SVG_SIZE * 0.75) }} />
            ) : null;
          })}
          <span className="text-xs font-medium tabular-nums ml-1">{p.count} molecule{p.count === 1 ? "" : "s"}</span>
        </div>
      </div>
    );
  };
  TooltipContent.displayName = "HistogramBarTooltipContent";
  return TooltipContent;
}

function ScatterTooltipContent({
  molecules,
  displayOptions,
  reactionArrowStyle,
  xLabel = "X",
  yLabel = "Y",
}: {
  molecules: MoleculeData[];
  displayOptions?: DepictorOptions;
  reactionArrowStyle?: ReactionArrowStyle;
  xLabel?: string;
  yLabel?: string;
}) {
  const TooltipContent = (props: { active?: boolean; payload?: readonly { payload?: { id?: string; x?: number; y?: number } }[] }) => {
    const { active, payload } = props;
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    const id = p?.id;
    if (!id) return null;
    const mol = molecules.find((m) => m.id === id);
    if (!mol) return null;
    const svg = generateSVG(mol.smiles, TOOLTIP_SVG_SIZE, Math.round(TOOLTIP_SVG_SIZE * 0.75), displayOptions, reactionArrowStyle ?? "forward");
    return (
      <div className="rounded-md border border-border/50 bg-background px-2 py-1.5 shadow-md">
        <div className="flex items-center gap-2">
          {svg && (
            <div className="shrink-0 rounded border border-border/40 overflow-hidden bg-muted" dangerouslySetInnerHTML={{ __html: svg }} style={{ width: TOOLTIP_SVG_SIZE, height: Math.round(TOOLTIP_SVG_SIZE * 0.75) }} />
          )}
          <div className="text-xs tabular-nums">
            {p.x != null && <div>{xLabel}: {typeof p.x === "number" && p.x % 1 !== 0 ? p.x.toFixed(2) : p.x}</div>}
            {p.y != null && <div>{yLabel}: {typeof p.y === "number" && p.y % 1 !== 0 ? p.y.toFixed(2) : p.y}</div>}
          </div>
        </div>
      </div>
    );
  };
  TooltipContent.displayName = "ScatterTooltipContent";
  return TooltipContent;
}

export type FilterToBinProperty = "mw" | "logP" | "tpsa";

interface PropertyChartsProps {
  molecules: MoleculeData[];
  hoveredMolecule: MoleculeData | null;
  onMoleculeClick?: (molecule: MoleculeData) => void;
  onFilterToBin?: (payload: { property: FilterToBinProperty; min: number; max: number }) => void;
  displayOptions?: DepictorOptions;
  reactionArrowStyle?: ReactionArrowStyle;
}

export function PropertyCharts({ molecules, hoveredMolecule, onMoleculeClick, onFilterToBin, displayOptions, reactionArrowStyle }: PropertyChartsProps) {
  const plotMolecules = useMemo(
    () => molecules.filter((m) => m.properties != null && m.mol != null),
    [molecules]
  );

  const [umapEmbedding, setUmapEmbedding] = useState<number[][] | null>(null);
  const [umapLoading, setUmapLoading] = useState(false);
  const umapAbortRef = useRef(false);

  useEffect(() => {
    if (plotMolecules.length < 2) {
      setUmapEmbedding(null);
      return;
    }
    const moleculesToEmbed = plotMolecules.slice(0, UMAP_MAX_POINTS);
    const n = moleculesToEmbed.length;
    const keys = UMAP_FEATURE_KEYS;
    const rawMatrix: number[][] = moleculesToEmbed.map((m) =>
      keys.map((k) => ((m.properties as unknown) as Record<string, number>)[k] ?? 0)
    );
    const mins = keys.map((_, j) => Math.min(...rawMatrix.map((row) => row[j])));
    const maxs = keys.map((_, j) => Math.max(...rawMatrix.map((row) => row[j])));
    const matrix = rawMatrix.map((row) =>
      row.map((v, j) => (maxs[j] - mins[j] ? (v - mins[j]) / (maxs[j] - mins[j]) : 0))
    );

    umapAbortRef.current = false;
    setUmapLoading(true);
    setUmapEmbedding(null);

    const umap = new UMAP({ nComponents: 2, nNeighbors: Math.min(15, n - 1), minDist: 0.1 });
    umap
      .fitAsync(matrix, () => !umapAbortRef.current)
      .then((embedding) => {
        if (!umapAbortRef.current) setUmapEmbedding(embedding);
      })
      .catch(() => {
        if (!umapAbortRef.current) setUmapEmbedding(null);
      })
      .finally(() => {
        if (!umapAbortRef.current) setUmapLoading(false);
      });

    return () => {
      umapAbortRef.current = true;
    };
  }, [plotMolecules]);

  const mwData = useMemo(() => {
    const values = plotMolecules.map((m) => m.properties!.mw);
    return buildHistogram(values, (a, b) =>
      `${Math.round(a)}–${Math.round(b)}`
    );
  }, [plotMolecules]);

  const mwConfig = useMemo(
    () =>
      ({
        count: { label: "Count", color: "var(--chart-1)" },
      }) satisfies ChartConfig,
    []
  );

  const hoveredMwBinIndex = useMemo(() => {
    if (!hoveredMolecule?.properties) return -1;
    return getBinIndex(
      hoveredMolecule.properties.mw,
      mwData.map((d) => ({ min: d.min, max: d.max }))
    );
  }, [hoveredMolecule, mwData]);

  const logPData = useMemo(() => {
    const values = plotMolecules.map((m) => m.properties!.logP);
    return buildHistogram(values, (a, b) =>
      `${a.toFixed(1)}–${b.toFixed(1)}`
    );
  }, [plotMolecules]);

  const logPConfig = useMemo(
    () =>
      ({
        count: { label: "Count", color: "var(--chart-2)" },
      }) satisfies ChartConfig,
    []
  );

  const hoveredLogPBinIndex = useMemo(() => {
    if (!hoveredMolecule?.properties) return -1;
    return getBinIndex(
      hoveredMolecule.properties.logP,
      logPData.map((d) => ({ min: d.min, max: d.max }))
    );
  }, [hoveredMolecule, logPData]);

  const tpsaData = useMemo(() => {
    const values = plotMolecules.map((m) => m.properties!.tpsa);
    return buildHistogram(values, (a, b) =>
      `${Math.round(a)}–${Math.round(b)}`
    );
  }, [plotMolecules]);

  const tpsaConfig = useMemo(
    () =>
      ({
        count: { label: "Count", color: "var(--chart-4)" },
      }) satisfies ChartConfig,
    []
  );

  const hoveredTpsaBinIndex = useMemo(() => {
    if (!hoveredMolecule?.properties) return -1;
    return getBinIndex(
      hoveredMolecule.properties.tpsa,
      tpsaData.map((d) => ({ min: d.min, max: d.max }))
    );
  }, [hoveredMolecule, tpsaData]);

  const radarConfig = useMemo(() => {
    const c: ChartConfig = {};
    RADAR_KEYS.forEach((k) => {
      c[k] = { label: RADAR_LABELS[k] ?? k, color: "var(--chart-3)" };
    });
    return c;
  }, []);

  const umapMolecules = useMemo(
    () => plotMolecules.slice(0, UMAP_MAX_POINTS),
    [plotMolecules]
  );

  const umapScatterData = useMemo(() => {
    if (!umapEmbedding || umapEmbedding.length !== umapMolecules.length) return [];
    return umapEmbedding.map((coord, i) => ({
      x: coord[0],
      y: coord[1],
      z: 1,
      id: umapMolecules[i].id,
    }));
  }, [umapEmbedding, umapMolecules]);

  const umapHoveredPoint = useMemo(() => {
    if (!hoveredMolecule || umapScatterData.length === 0) return null;
    return umapScatterData.find((p) => p.id === hoveredMolecule.id) ?? null;
  }, [hoveredMolecule, umapScatterData]);

  const umapConfig = useMemo(
    () =>
      ({
        x: { label: "UMAP 1", color: "var(--chart-5)" },
        y: { label: "UMAP 2", color: "var(--chart-5)" },
      }) satisfies ChartConfig,
    []
  );

  const mwLogPScatterData = useMemo(
    () =>
      plotMolecules.map((m) => ({
        x: m.properties!.mw,
        y: m.properties!.logP,
        id: m.id,
        z: 1,
      })),
    [plotMolecules]
  );

  const mwLogPHoveredPoint = useMemo(() => {
    if (!hoveredMolecule?.properties) return null;
    return {
      x: hoveredMolecule.properties.mw,
      y: hoveredMolecule.properties.logP,
      id: hoveredMolecule.id,
      z: 1,
    };
  }, [hoveredMolecule]);

  const tpsaLogPScatterData = useMemo(
    () =>
      plotMolecules.map((m) => ({
        x: m.properties!.tpsa,
        y: m.properties!.logP,
        id: m.id,
        z: 1,
      })),
    [plotMolecules]
  );

  const tpsaLogPHoveredPoint = useMemo(() => {
    if (!hoveredMolecule?.properties) return null;
    return {
      x: hoveredMolecule.properties.tpsa,
      y: hoveredMolecule.properties.logP,
      id: hoveredMolecule.id,
      z: 1,
    };
  }, [hoveredMolecule]);

  const scatterConfig = useMemo(
    () =>
      ({
        x: { label: "x", color: "var(--chart-5)" },
        y: { label: "y", color: "var(--chart-5)" },
      }) satisfies ChartConfig,
    []
  );

  const radarData = useMemo(() => {
    const points = RADAR_KEYS.map((key) => {
      const values = plotMolecules.map((m) => ((m.properties as unknown) as Record<string, number>)[key] ?? 0);
      const maxVal = Math.max(...values, RADAR_MAX[key] ?? 100);
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const normalizedAvg = (avg / maxVal) * 100;
      const item: Record<string, string | number> = {
        subject: RADAR_LABELS[key] ?? key,
        fullMark: 100,
        average: Math.min(100, Math.max(0, normalizedAvg)),
      };
      if (hoveredMolecule?.properties) {
        const raw = ((hoveredMolecule.properties as unknown) as Record<string, number>)[key] ?? 0;
        item.hovered = normalizeRadarValue(key, raw);
      }
      return item;
    });
    return points;
  }, [plotMolecules, hoveredMolecule]);

  if (plotMolecules.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-1">
        No molecules with properties to plot.
      </div>
    );
  }

  const chartHeight = 120;

  return (
    <div className="flex items-stretch gap-2 flex-1 min-w-0 min-h-[112px] w-full">
      {/* MW bar */}
      <div className="flex flex-col flex-1 min-w-[70px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
          MW
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={mwConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={mwData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <CartesianGrid vertical={false} strokeDasharray="1 1" strokeOpacity={0.3} />
              <XAxis
                dataKey="bin"
                tickLine={false}
                tickMargin={2}
                axisLine={false}
                tick={{ fontSize: 6 }}
                height={20}
                interval="preserveStartEnd"
              />
              <ChartTooltip cursor={false} content={HistogramBarTooltipContent({ plotMolecules, property: "mw", data: mwData, displayOptions, reactionArrowStyle }) as (props: unknown) => React.ReactNode} />
              <Bar
                dataKey="count"
                fill="var(--chart-1)"
                radius={4}
                barSize={6}
                onClick={(_, index) => {
                  if (index == null || !mwData[index]) return;
                  const bin = mwData[index];
                  const inBin = plotMolecules.filter(
                    (m) =>
                      m.properties!.mw >= bin.min &&
                      (index === mwData.length - 1 ? m.properties!.mw <= bin.max : m.properties!.mw < bin.max)
                  );
                  if (inBin.length > 0) onMoleculeClick?.(inBin[0]);
                  onFilterToBin?.({ property: "mw", min: bin.min, max: bin.max });
                }}
                style={{ cursor: onMoleculeClick || onFilterToBin ? "pointer" : undefined }}
              >
                {mwData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === hoveredMwBinIndex ? HOVER_HIGHLIGHT_COLOR : "var(--chart-1)"}
                    opacity={index === hoveredMwBinIndex ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* LogP bar */}
      <div className="flex flex-col flex-1 min-w-[70px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
          LogP
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={logPConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={logPData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <CartesianGrid vertical={false} strokeDasharray="1 1" strokeOpacity={0.3} />
              <XAxis
                dataKey="bin"
                tickLine={false}
                tickMargin={2}
                axisLine={false}
                tick={{ fontSize: 6 }}
                height={20}
                interval="preserveStartEnd"
              />
              <ChartTooltip cursor={false} content={HistogramBarTooltipContent({ plotMolecules, property: "logP", data: logPData, displayOptions, reactionArrowStyle }) as (props: unknown) => React.ReactNode} />
              <Bar
                dataKey="count"
                fill="var(--chart-2)"
                radius={4}
                barSize={6}
                onClick={(_, index) => {
                  if (index == null || !logPData[index]) return;
                  const bin = logPData[index];
                  const inBin = plotMolecules.filter(
                    (m) =>
                      m.properties!.logP >= bin.min &&
                      (index === logPData.length - 1 ? m.properties!.logP <= bin.max : m.properties!.logP < bin.max)
                  );
                  if (inBin.length > 0) onMoleculeClick?.(inBin[0]);
                  onFilterToBin?.({ property: "logP", min: bin.min, max: bin.max });
                }}
                style={{ cursor: onMoleculeClick || onFilterToBin ? "pointer" : undefined }}
              >
                {logPData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === hoveredLogPBinIndex ? HOVER_HIGHLIGHT_COLOR : "var(--chart-2)"}
                    opacity={index === hoveredLogPBinIndex ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* TPSA bar */}
      <div className="flex flex-col flex-1 min-w-[70px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
          TPSA
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={tpsaConfig} className="h-full w-full">
            <BarChart accessibilityLayer data={tpsaData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <CartesianGrid vertical={false} strokeDasharray="1 1" strokeOpacity={0.3} />
              <XAxis
                dataKey="bin"
                tickLine={false}
                tickMargin={2}
                axisLine={false}
                tick={{ fontSize: 6 }}
                height={20}
                interval="preserveStartEnd"
              />
              <ChartTooltip cursor={false} content={HistogramBarTooltipContent({ plotMolecules, property: "tpsa", data: tpsaData, displayOptions, reactionArrowStyle }) as (props: unknown) => React.ReactNode} />
              <Bar
                dataKey="count"
                fill="var(--chart-4)"
                radius={4}
                barSize={6}
                onClick={(_, index) => {
                  if (index == null || !tpsaData[index]) return;
                  const bin = tpsaData[index];
                  const inBin = plotMolecules.filter(
                    (m) =>
                      m.properties!.tpsa >= bin.min &&
                      (index === tpsaData.length - 1 ? m.properties!.tpsa <= bin.max : m.properties!.tpsa < bin.max)
                  );
                  if (inBin.length > 0) onMoleculeClick?.(inBin[0]);
                  onFilterToBin?.({ property: "tpsa", min: bin.min, max: bin.max });
                }}
                style={{ cursor: onMoleculeClick || onFilterToBin ? "pointer" : undefined }}
              >
                {tpsaData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === hoveredTpsaBinIndex ? HOVER_HIGHLIGHT_COLOR : "var(--chart-4)"}
                    opacity={index === hoveredTpsaBinIndex ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* MW vs LogP scatter */}
      <div className="flex flex-col flex-1 min-w-[80px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0 text-center">
          MW vs LogP
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={scatterConfig} className="h-full w-full">
            <ScatterChart margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <XAxis type="number" dataKey="x" hide tick={{ fontSize: 6 }} />
              <YAxis type="number" dataKey="y" hide tick={{ fontSize: 6 }} />
              <ZAxis type="number" dataKey="z" range={[5, 8]} />
              <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={ScatterTooltipContent({ molecules, displayOptions, reactionArrowStyle, xLabel: "MW", yLabel: "LogP" }) as (props: unknown) => React.ReactNode} />
              <Scatter
                data={mwLogPScatterData}
                fill="var(--chart-1)"
                fillOpacity={0.7}
                name="MW vs LogP"
                onClick={(data: { id?: string }) => {
                  if (data?.id) {
                    const mol = molecules.find((m) => m.id === data.id);
                    if (mol) onMoleculeClick?.(mol);
                  }
                }}
                style={{ cursor: onMoleculeClick ? "pointer" : undefined }}
              />
              {mwLogPHoveredPoint && (
                <Scatter
                  data={[mwLogPHoveredPoint]}
                  fill={HOVER_HIGHLIGHT_COLOR}
                  fillOpacity={1}
                  name="Hovered"
                />
              )}
            </ScatterChart>
          </ChartContainer>
        </div>
      </div>

      {/* TPSA vs LogP scatter */}
      <div className="flex flex-col flex-1 min-w-[80px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0 text-center">
          TPSA vs LogP
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={scatterConfig} className="h-full w-full">
            <ScatterChart margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <XAxis type="number" dataKey="x" hide tick={{ fontSize: 6 }} />
              <YAxis type="number" dataKey="y" hide tick={{ fontSize: 6 }} />
              <ZAxis type="number" dataKey="z" range={[5, 8]} />
              <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={ScatterTooltipContent({ molecules, displayOptions, reactionArrowStyle, xLabel: "TPSA", yLabel: "LogP" }) as (props: unknown) => React.ReactNode} />
              <Scatter
                data={tpsaLogPScatterData}
                fill="var(--chart-4)"
                fillOpacity={0.7}
                name="TPSA vs LogP"
                onClick={(data: { id?: string }) => {
                  if (data?.id) {
                    const mol = molecules.find((m) => m.id === data.id);
                    if (mol) onMoleculeClick?.(mol);
                  }
                }}
                style={{ cursor: onMoleculeClick ? "pointer" : undefined }}
              />
              {tpsaLogPHoveredPoint && (
                <Scatter
                  data={[tpsaLogPHoveredPoint]}
                  fill={HOVER_HIGHLIGHT_COLOR}
                  fillOpacity={1}
                  name="Hovered"
                />
              )}
            </ScatterChart>
          </ChartContainer>
        </div>
      </div>

      {/* Radar */}
      <div className="flex flex-col flex-1 min-w-[80px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0 text-center">
          Radar
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          <ChartContainer config={radarConfig} className="h-full w-full">
            <RadarChart data={radarData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <PolarGrid gridType="circle" strokeOpacity={0.4} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 6 }} tickLine={false} />
              <Radar
                name="Average"
                dataKey="average"
                fill="var(--chart-3)"
                fillOpacity={0.3}
                stroke="var(--chart-3)"
                dot={false}
              />
              {hoveredMolecule && (
                <Radar
                  name="Hovered"
                  dataKey="hovered"
                  fill={HOVER_HIGHLIGHT_COLOR}
                  fillOpacity={0.6}
                  stroke={HOVER_HIGHLIGHT_COLOR}
                  dot={{ r: 2, fillOpacity: 1 }}
                />
              )}
            </RadarChart>
          </ChartContainer>
        </div>
      </div>

      {/* UMAP scatter */}
      <div className="flex flex-col flex-1 min-w-[80px] rounded-md border border-border/50 bg-background/50 overflow-hidden">
        <div className="px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0 text-center">
          UMAP
        </div>
        <div className="w-full shrink-0" style={{ height: chartHeight }}>
          {umapLoading ? (
            <div className="h-full w-full flex items-center justify-center text-[9px] text-muted-foreground">
              Computing…
            </div>
          ) : umapScatterData.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center text-[9px] text-muted-foreground">
              {plotMolecules.length < 2 ? "Need ≥2 molecules" : "—"}
            </div>
          ) : (
            <ChartContainer config={umapConfig} className="h-full w-full">
              <ScatterChart margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <XAxis type="number" dataKey="x" hide tick={{ fontSize: 6 }} />
                <YAxis type="number" dataKey="y" hide tick={{ fontSize: 6 }} />
                <ZAxis type="number" dataKey="z" range={[5, 8]} />
                <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={ScatterTooltipContent({ molecules, displayOptions, reactionArrowStyle, xLabel: "UMAP 1", yLabel: "UMAP 2" }) as (props: unknown) => React.ReactNode} />
                <Scatter
                  data={umapScatterData}
                  fill="var(--chart-5)"
                  fillOpacity={0.8}
                  name="Molecules"
                  onClick={(data: { id?: string }) => {
                    if (data?.id) {
                      const mol = molecules.find((m) => m.id === data.id);
                      if (mol) onMoleculeClick?.(mol);
                    }
                  }}
                  style={{ cursor: onMoleculeClick ? "pointer" : undefined }}
                />
                {umapHoveredPoint && (
                  <Scatter
                    data={[{ ...umapHoveredPoint, z: 1 }]}
                    fill={HOVER_HIGHLIGHT_COLOR}
                    fillOpacity={1}
                    name="Hovered"
                  />
                )}
              </ScatterChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}
