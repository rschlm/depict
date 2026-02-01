/**
 * Post-process SVG to add highlight circles around atoms with atom mapping.
 * Finds circles with data-atom-map-no and inserts a colored circle behind each.
 */
const ATOM_MAP_HIGHLIGHT_COLORS = [
  "rgba(239, 68, 68, 0.35)",   // red
  "rgba(59, 130, 246, 0.35)",   // blue
  "rgba(34, 197, 94, 0.35)",    // green
  "rgba(249, 115, 22, 0.35)",   // orange
  "rgba(168, 85, 247, 0.35)",   // purple
  "rgba(14, 165, 233, 0.35)",   // sky
  "rgba(234, 88, 12, 0.35)",    // dark orange
];

/**
 * Add highlight circles around mapped atoms in an SVG string.
 * Finds circles with data-atom-map-no and inserts a colored circle behind each.
 */
export function addAtomMapHighlightCircles(svg: string): string {
  const circleRegex = /<circle[^>]*data-atom-map-no="(\d+)"[^>]*>/g;
  const mapNoToColor = new Map<number, string>();
  let colorIndex = 0;

  const getColor = (mapNo: number): string => {
    if (!mapNoToColor.has(mapNo)) {
      mapNoToColor.set(mapNo, ATOM_MAP_HIGHLIGHT_COLORS[colorIndex++ % ATOM_MAP_HIGHLIGHT_COLORS.length]);
    }
    return mapNoToColor.get(mapNo)!;
  };

  let result = svg;
  const matches = [...svg.matchAll(circleRegex)];

  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const fullMatch = m[0];
    const mapNo = parseInt(m[1], 10);
    const cxMatch = fullMatch.match(/cx="([^"]+)"/);
    const cyMatch = fullMatch.match(/cy="([^"]+)"/);
    if (!cxMatch || !cyMatch) continue;
    const cx = cxMatch[1];
    const cy = cyMatch[1];
    const color = getColor(mapNo);
    const insertIdx = m.index!;
    const highlightCircle = `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}" stroke="none" />`;
    result = result.slice(0, insertIdx) + highlightCircle + result.slice(insertIdx);
  }

  return result;
}
