import { NextRequest, NextResponse } from "next/server";
import { generateSVG, type ReactionArrowStyle } from "@/lib/svgGenerator";
import type { DepictorOptions } from "openchemlib";

export const dynamic = "force-dynamic";

const ARROW_STYLES: ReactionArrowStyle[] = [
  "forward",
  "equilibrium",
  "retrosynthesis",
  "no-go",
  "resonance",
];

function parseDisplayOptions(body: Record<string, unknown>): DepictorOptions | undefined {
  const opts: DepictorOptions = {};
  if (typeof body.showAtomNumber === "boolean") opts.showAtomNumber = body.showAtomNumber;
  if (typeof body.showBondNumber === "boolean") opts.showBondNumber = body.showBondNumber;
  if (typeof body.showMapping === "boolean") opts.showMapping = body.showMapping;
  if (typeof body.drawBondsInGray === "boolean") opts.drawBondsInGray = body.drawBondsInGray;
  if (typeof body.noImplicitHydrogen === "boolean") opts.noImplicitHydrogen = body.noImplicitHydrogen;
  if (typeof body.noAtomCustomLabels === "boolean") opts.noAtomCustomLabels = body.noAtomCustomLabels;
  if (typeof body.noCarbonLabelWithCustomLabel === "boolean")
    opts.noCarbonLabelWithCustomLabel = body.noCarbonLabelWithCustomLabel;
  if (Object.keys(opts).length === 0) return undefined;
  return opts;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const smiles = body.smiles;
    if (typeof smiles !== "string" || !smiles.trim()) {
      return NextResponse.json(
        { error: "Missing required field: smiles (string)" },
        { status: 400 }
      );
    }
    const width = Math.min(800, Math.max(80, Number(body.width) || 240));
    const height = Math.min(600, Math.max(60, Number(body.height) || 200));
    const arrowStyle =
      typeof body.arrowStyle === "string" && ARROW_STYLES.includes(body.arrowStyle)
        ? body.arrowStyle
        : "forward";
    const displayOptions = parseDisplayOptions(body);
    const svg = generateSVG(smiles.trim(), width, height, displayOptions, arrowStyle);
    if (!svg) {
      return NextResponse.json({ error: "Failed to generate SVG for given SMILES" }, { status: 422 });
    }
    const format = body.format === "json" ? "json" : "svg";
    if (format === "json") {
      return NextResponse.json({ svg });
    }
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "SVG generation failed" },
      { status: 500 }
    );
  }
}
