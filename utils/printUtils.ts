/**
 * Print-friendly view and PDF export (via browser's Save as PDF).
 */
import { generateSVG } from "@/lib/svgGenerator";
import type { DepictorOptions } from "openchemlib";
import type { ReactionArrowStyle } from "@/store/useChemStore";

export interface MoleculeForPrint {
  id: string;
  smiles: string;
  properties?: { mw?: number; logP?: number } | null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function openPrintView(
  molecules: MoleculeForPrint[],
  options: {
    displayOptions?: DepictorOptions;
    reactionArrowStyle?: ReactionArrowStyle;
    title?: string;
    showProperties?: boolean;
  } = {}
): boolean {
  const {
    displayOptions = {},
    reactionArrowStyle = "forward",
    title = "Depict - Molecule Grid",
    showProperties = true,
  } = options;

  const w = 180;
  const h = 130;
  const cols = 4;
  const gap = 16;

  const cards = molecules.map((m) => {
    const svg = generateSVG(m.smiles, w, h, displayOptions, reactionArrowStyle);
    const mw = m.properties?.mw;
    const logP = m.properties?.logP;
    const propsHtml =
      showProperties && (mw != null || logP != null)
        ? `<div class="props">${mw != null ? `MW: ${mw.toFixed(1)}` : ""}${mw != null && logP != null ? " · " : ""}${logP != null ? `LogP: ${logP.toFixed(2)}` : ""}</div>`
        : "";
    const structureHtml = svg
      ? svg
      : '<span class="invalid">Invalid</span>';
    const smilesShort =
      m.smiles.length > 40 ? m.smiles.slice(0, 37) + "…" : m.smiles;
    return `
      <div class="card">
        <div class="structure">${structureHtml}</div>
        <div class="smiles" title="${escapeHtml(m.smiles)}">${escapeHtml(smilesShort)}</div>
        ${propsHtml}
      </div>`;
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 24px; background: #fff; color: #111; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 16px 0; font-weight: 600; }
    .toolbar { margin-bottom: 20px; }
    .toolbar button { padding: 8px 16px; font-size: 14px; cursor: pointer; background: #0f172a; color: white; border: none; border-radius: 6px; }
    .toolbar button:hover { background: #1e293b; }
    .grid { display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: ${gap}px; }
    .card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; align-items: center; break-inside: avoid; }
    .card .structure { width: ${w}px; height: ${h}px; display: flex; align-items: center; justify-content: center; }
    .card .structure svg { max-width: 100%; max-height: 100%; }
    .card .structure .invalid { color: #94a3b8; font-size: 11px; }
    .card .smiles { margin-top: 8px; font-family: ui-monospace, monospace; font-size: 10px; color: #475569; word-break: break-all; text-align: center; max-width: 100%; }
    .card .props { margin-top: 4px; font-size: 10px; color: #64748b; }
    @media print {
      body { padding: 12px; }
      .toolbar { display: none !important; }
      .grid { gap: 12px; }
      .card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${escapeHtml(title)}</h1>
    <p style="margin: 0 0 12px 0; color: #64748b;">${molecules.length} structure${molecules.length === 1 ? "" : "s"}. Use Print (Ctrl+P) and choose &quot;Save as PDF&quot; to export.</p>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="grid">${cards.join("")}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer,width=900,height=700");
  if (win) {
    win.addEventListener("load", () => URL.revokeObjectURL(url));
    return true;
  } else {
    URL.revokeObjectURL(url);
    return false;
  }
}
