/**
 * Server-safe SVG generation for molecules and reactions.
 * Used by both the client (useCachedSVG) and API routes.
 */
import { Molecule, Reaction, DepictorOptions } from "openchemlib";
import { ATOM_COLORS } from "@/constants/theme";
import {
  hasAtomMaps,
  collectMapNumbers,
} from "@/utils/atomMapping";
import { addAtomMapHighlightCircles } from "@/utils/atomMapHighlight";

export type ReactionArrowStyle =
  | "forward"
  | "equilibrium"
  | "retrosynthesis"
  | "no-go"
  | "resonance";

function generateArrowSVG(
  arrowStyle: ReactionArrowStyle,
  arrowX: number,
  arrowY: number,
  arrowLength: number
): string {
  switch (arrowStyle) {
    case "forward":
      const scaleFwd = arrowLength / 17.692876;
      const offsetYFwd = arrowY - 1.599977 * scaleFwd;
      return `
                <g transform="translate(0, ${offsetYFwd}) scale(${scaleFwd}, ${scaleFwd})">
                    <polygon points="0 1.899977 12.49296 1.899977 12.49296 1.299977 0 1.299977" fill="currentColor"/>
                    <path d="M17.692876,1.599977 C17.692876,1.599977 11.692966,3.149954 11.692966,3.149954 C11.692966,3.149954 12.442956,2.278092 12.442956,1.599977 C12.442956,0.899987 11.692966,0 11.692966,0 C11.692966,0 17.692876,1.599977 17.692876,1.599977 C17.692876,1.599977 17.692876,1.599977 17.692876,1.599977 Z" fill="currentColor"/>
                </g>
            `;
    case "equilibrium":
      const scaleEq = arrowLength / 17.902477;
      const offsetYEq = arrowY - 2.5 * scaleEq;
      return `
                <g transform="translate(0, ${offsetYEq}) scale(${scaleEq}, ${scaleEq})">
                    <polygon points="0.899987 1.899977 12.702557 1.899977 12.702557 1.299977 0.899987 1.299977" fill="currentColor"/>
                    <polygon points="5.19992 3.699949 17.00249 3.699949 17.00249 3.099949 5.19992 3.099949" fill="currentColor"/>
                    <path d="M17.902477,1.899977 C17.902477,1.899977 12.652557,1.899977 12.652557,1.899977 C12.652557,0.899987 11.902567,0 11.902567,0 C11.902567,0 17.902477,1.899977 17.902477,1.899977 C17.902477,1.899977 17.902477,1.899977 17.902477,1.899977 Z" fill="currentColor"/>
                    <path d="M0,3.099949 C0,3.099949 5.999909,4.999926 5.999909,4.999926 C5.999909,4.999926 5.24992,3.499939 5.24992,3.099949 C5.24992,3.099949 0,3.099949 0,3.099949 C0,3.099949 0,3.099949 0,3.099949 Z" fill="currentColor"/>
                </g>
            `;
    case "retrosynthesis":
      const scale = arrowLength / 28.20005;
      const offsetY = arrowY - 3.59995 * scale;
      return `
                <g transform="translate(0, ${offsetY}) scale(${scale}, ${scale})">
                    <line x1="0" y1="1.8" x2="28.20005" y2="1.8" stroke="currentColor" stroke-linecap="round"/>
                    <line x1="28.20005" y1="1.8" x2="26.40005" y2="0" stroke="currentColor" stroke-linecap="round"/>
                    <line x1="26.40005" y1="0" x2="30" y2="3.59995" stroke="currentColor" stroke-linecap="round"/>
                    <line x1="30" y1="3.59995" x2="26.40005" y2="7.1999" stroke="currentColor" stroke-linecap="round"/>
                    <line x1="26.40005" y1="7.1999" x2="28.20005" y2="5.3999" stroke="currentColor" stroke-linecap="round"/>
                    <line x1="28.20005" y1="5.3999" x2="0" y2="5.3999" stroke="currentColor" stroke-linecap="round"/>
                </g>
            `;
    case "no-go":
      const scaleNoGo = arrowLength / 21.867607;
      const offsetYNoGo = arrowY - 3.199954 * scaleNoGo;
      return `
                <g transform="translate(0, ${offsetYNoGo}) scale(${scaleNoGo}, ${scaleNoGo})">
                    <polygon points="0 3.499954 16.66768 3.499954 16.66768 2.899954 0 2.899954" fill="currentColor"/>
                    <path d="M21.867607,3.199954 C21.867607,3.199954 15.867697,4.749931 15.867697,4.749931 C15.867697,4.749931 16.617687,3.878069 16.617687,3.199954 C16.617687,2.499964 15.867697,1.599977 15.867697,1.599977 C15.867697,1.599977 21.867607,3.199954 21.867607,3.199954 C21.867607,3.199954 21.867607,3.199954 21.867607,3.199954 Z" fill="currentColor"/>
                    <polygon points="13.733757 6.399908 7.733847 0.4 8.133847 0 14.133757 5.999908" fill="currentColor"/>
                    <polygon points="7.733847 5.999908 13.733757 0 14.133757 0.4 8.133847 6.399908" fill="currentColor"/>
                </g>
            `;
    case "resonance":
      const scaleRes = arrowLength / 23.060382;
      const offsetYRes = arrowY - 1.599978 * scaleRes;
      return `
                <g transform="translate(0, ${offsetYRes}) scale(${scaleRes}, ${scaleRes})">
                    <polygon points="5.19992 1.899978 17.86046 1.899978 17.86046 1.299978 5.19992 1.299978" fill="currentColor"/>
                    <path d="M23.060382,1.599978 C23.060382,1.599978 17.060472,3.149955 17.060472,3.149955 C17.060472,3.149955 17.810462,2.278093 17.810462,1.599978 C17.810462,0.899988 17.060472,0 17.060472,0 C17.060472,0 23.060382,1.599978 23.060382,1.599978 C23.060382,1.599978 23.060382,1.599978 23.060382,1.599978 Z" fill="currentColor"/>
                    <path d="M0,1.599978 C0,1.599978 5.999908,3.199955 5.999908,3.199955 C5.999908,3.199955 5.24992,2.299968 5.24992,1.599978 C5.24992,0.921863 5.999908,0.05 5.999908,0.05 C5.999908,0.05 0,1.599978 0,1.599978 C0,1.599978 0,1.599978 0,1.599978 Z" fill="currentColor"/>
                </g>
            `;
    default:
      return generateArrowSVG("forward", arrowX, arrowY, arrowLength);
  }
}

export function generateSVG(
  smiles: string,
  width: number,
  height: number,
  displayOptions?: DepictorOptions,
  arrowStyle: ReactionArrowStyle = "forward"
): string | null {
  try {
    let svg: string | null = null;

    if (smiles.includes(">>")) {
      const steps = smiles.split(">>").filter((s) => s.trim().length > 0);
      if (steps.length < 2) return null;

      const isThumbnail = width <= 120;

      if (isThumbnail && steps.length > 2) {
        try {
          const firstStep = steps[0].includes(">") ? steps[0].split(">")[0] : steps[0];
          const lastStep = steps[steps.length - 1].includes(">")
            ? steps[steps.length - 1].split(">").pop()!
            : steps[steps.length - 1];
          const simplifiedSvg = generateSVG(`${firstStep}>${lastStep}`, width, height, displayOptions, arrowStyle);
          if (simplifiedSvg) {
            svg = simplifiedSvg;
          }
        } catch { /* fall through */ }
      }

      if (!svg) {
        try {
          const extractSVGContent = (svgString: string): string => {
            const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
            return match ? match[1] : svgString;
          };
          const arrowLength = Math.min(24, Math.max(12, Math.floor(width / (steps.length * 4))));
          const arrowSpacing = Math.min(10, Math.max(4, Math.floor(width / (steps.length * 8))));
          const totalArrowSpace = (steps.length - 1) * (arrowLength + arrowSpacing * 2);
          const stepWidth = Math.max(30, Math.floor((width - totalArrowSpace) / steps.length));
          const stepMolecules: (Molecule | null)[] = [];
          for (const step of steps) {
            if (step.includes(">")) {
              stepMolecules.push(null);
            } else {
              try {
                const mol = Molecule.fromSmiles(step);
                stepMolecules.push(mol && mol.getAllAtoms() > 0 ? mol : null);
              } catch {
                stepMolecules.push(null);
              }
            }
          }
          const multiStepMols = stepMolecules.filter((m): m is Molecule => m != null);
          const multiStepHasMaps =
            multiStepMols.length > 0 && collectMapNumbers(multiStepMols).length > 0;
          const multiStepOpts = multiStepHasMaps
            ? { ...displayOptions, showMapping: displayOptions?.showMapping ?? true }
            : displayOptions;
          const stepContents: string[] = [];
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            let content: string | null = null;
            if (step.includes(">")) {
              const stepSvg = generateSVG(step, stepWidth, height, displayOptions, arrowStyle);
              content = stepSvg ? extractSVGContent(stepSvg) : null;
            } else {
              const mol = stepMolecules[i];
              if (mol && mol.getAllAtoms() > 0) {
                content = extractSVGContent(mol.toSVG(stepWidth, height, undefined, multiStepOpts));
              }
            }
            if (!content) throw new Error(`Invalid step: ${step}`);
            stepContents.push(content);
          }
          let currentX = 0;
          const groups: string[] = [];
          stepContents.forEach((content, i) => {
            groups.push(`<g transform="translate(${currentX}, 0)">${content}</g>`);
            currentX += stepWidth + arrowSpacing;
            if (i < stepContents.length - 1) {
              const arrowY = height / 2;
              const arrowSVG = generateArrowSVG(arrowStyle, 0, arrowY, arrowLength);
              groups.push(`<g transform="translate(${currentX}, 0)">${arrowSVG}</g>`);
              currentX += arrowLength + arrowSpacing;
            }
          });
          svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
          ${groups.join("\n          ")}
        </svg>`;
        } catch {
          return null;
        }
      }
    } else if (smiles.includes(">") && !smiles.includes(">>")) {
      const extractSVGContent = (svgString: string): string => {
        const match = svgString.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
        return match ? match[1] : svgString;
      };
      const arrowLength = 20;
      const gap = 10;
      let reaction: Reaction | null = null;
      try {
        reaction = Reaction.fromSmiles(smiles);
      } catch {
        /* fallback */
      }
      if (reaction && !reaction.isEmpty()) {
        try {
          const nR = reaction.getReactants();
          const nC = reaction.getCatalysts();
          const nP = reaction.getProducts();
          const hasAgents = nC > 0;
          const molCount = nR + nP;
          if (molCount > 0 || nC > 0) {
            const optsWithMapping = hasAtomMaps(reaction)
              ? { ...displayOptions, showMapping: displayOptions?.showMapping ?? true }
              : displayOptions;
            const totalArrowSpace = arrowLength + gap * 2;
            const molWidth =
              molCount > 0
                ? Math.floor(
                    (width - totalArrowSpace - gap * Math.max(0, molCount - 1)) / molCount
                  )
                : Math.floor(width / 2);
            const molHeight = height;
            const groups: string[] = [];
            let currentX = 0;
            for (let i = 0; i < nR; i++) {
              const mol = reaction.getReactant(i);
              groups.push(
                `<g transform="translate(${currentX}, 0)">${extractSVGContent(mol.toSVG(molWidth, molHeight, undefined, optsWithMapping))}</g>`
              );
              currentX += molWidth + gap;
            }
            const arrowX = currentX;
            const arrowY = height / 2;
            const arrowSVG = generateArrowSVG(arrowStyle, 0, arrowY, arrowLength);
            if (hasAgents) {
              const agentScale = 0.45;
              const agentH = Math.floor(height * agentScale);
              const totalAgentWidth = Math.max(arrowLength + gap * 2, molWidth * 0.8);
              const agentW = Math.floor(totalAgentWidth / nC);
              const agentStartX = arrowX - Math.floor((totalAgentWidth - arrowLength) / 2);
              let agentX = Math.max(0, agentStartX);
              const agentY = Math.max(2, Math.floor(height / 2 - agentH - 6));
              for (let i = 0; i < nC; i++) {
                const mol = reaction.getCatalyst(i);
                groups.push(
                  `<g transform="translate(${agentX}, ${agentY})">${extractSVGContent(mol.toSVG(agentW, agentH, undefined, optsWithMapping))}</g>`
                );
                agentX += agentW + 4;
              }
            }
            groups.push(`<g transform="translate(${arrowX}, 0)">${arrowSVG}</g>`);
            currentX += arrowLength + gap * 2;
            for (let i = 0; i < nP; i++) {
              const mol = reaction.getProduct(i);
              groups.push(
                `<g transform="translate(${currentX}, 0)">${extractSVGContent(mol.toSVG(molWidth, molHeight, undefined, optsWithMapping))}</g>`
              );
              currentX += molWidth + gap;
            }
            if (groups.length === 1) {
              const sole =
                nR > 0
                  ? reaction.getReactant(0)
                  : nC > 0
                    ? reaction.getCatalyst(0)
                    : reaction.getProduct(0);
              svg = sole.toSVG(width, height, undefined, optsWithMapping);
            } else {
              svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
          ${groups.join("\n          ")}
        </svg>`;
            }
          }
        } catch {
          /* fallback */
        }
      }
      if (!svg) {
        try {
          const parts = smiles.split(">").map((p) => p.trim()).filter(Boolean);
          if (parts.length >= 2) {
            const mols = parts.map((p) => Molecule.fromSmiles(p));
            const fallbackHasMaps = collectMapNumbers(mols).length > 0;
            const fallbackOpts = fallbackHasMaps
              ? { ...displayOptions, showMapping: displayOptions?.showMapping ?? true }
              : displayOptions;
            const totalArrowSpace = arrowLength + gap * 2;
            const molCount = 2;
            const molWidth = Math.floor((width - totalArrowSpace - gap) / molCount);
            const molHeight = height;
            const groups: string[] = [];
            let currentX = 0;
            if (parts.length === 2) {
              groups.push(
                `<g transform="translate(0, 0)">${extractSVGContent(mols[0].toSVG(molWidth, molHeight, undefined, fallbackOpts))}</g>`
              );
              currentX += molWidth + gap;
              const arrowY = height / 2;
              const arrowSVG = generateArrowSVG(arrowStyle, 0, arrowY, arrowLength);
              groups.push(`<g transform="translate(${currentX}, 0)">${arrowSVG}</g>`);
              currentX += arrowLength + gap * 2;
              groups.push(
                `<g transform="translate(${currentX}, 0)">${extractSVGContent(mols[1].toSVG(molWidth, molHeight, undefined, fallbackOpts))}</g>`
              );
            } else {
              groups.push(
                `<g transform="translate(0, 0)">${extractSVGContent(mols[0].toSVG(molWidth, molHeight, undefined, fallbackOpts))}</g>`
              );
              currentX += molWidth + gap;
              const arrowX = currentX;
              const arrowY = height / 2;
              const arrowSVG = generateArrowSVG(arrowStyle, 0, arrowY, arrowLength);
              const agentScale = 0.55;
              const agentH = Math.floor(height * agentScale);
              const agentW = Math.floor((arrowLength + gap * 2) / (parts.length - 2));
              let agentX = arrowX;
              const agentY = Math.max(2, Math.floor(height / 2 - agentH - 4));
              for (let i = 1; i < parts.length - 1; i++) {
                groups.push(
                  `<g transform="translate(${agentX}, ${agentY})">${extractSVGContent(mols[i].toSVG(agentW, agentH, undefined, fallbackOpts))}</g>`
                );
                agentX += agentW + 4;
              }
              groups.push(`<g transform="translate(${arrowX}, 0)">${arrowSVG}</g>`);
              currentX += arrowLength + gap * 2;
              groups.push(
                `<g transform="translate(${currentX}, 0)">${extractSVGContent(mols[mols.length - 1].toSVG(molWidth, molHeight, undefined, fallbackOpts))}</g>`
              );
            }
            svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
          ${groups.join("\n          ")}
        </svg>`;
          }
        } catch {
          return null;
        }
      }
      if (!svg) return null;
    } else {
      const mol = Molecule.fromSmiles(smiles);
      if (!mol || mol.getAllAtoms() === 0) return null;
      svg = mol.toSVG(width, height, undefined, displayOptions);
    }

    if (!svg) return null;
    svg = svg.replace(/#000000/g, "currentColor").replace(/#000/g, "currentColor");
    svg = svg.replace(/rgb\(0,\s*0,\s*0\)/g, "currentColor");
    svg = svg.replace(/#FF0000/g, ATOM_COLORS[8] || "#f472b6");
    svg = svg.replace(/#0000FF/g, ATOM_COLORS[7] || "#818cf8");
    svg = svg.replace(/rgb\(255,\s*0,\s*0\)/g, ATOM_COLORS[8] || "#f472b6");
    svg = svg.replace(/rgb\(0,\s*0,\s*255\)/g, ATOM_COLORS[7] || "#818cf8");
    const styleInject = `
      <style>
        .ocl-svg { color: currentColor; }
        .ocl-svg text { fill: currentColor; font-family: 'JetBrains Mono', monospace; }
      </style>
    `;
    if (!svg.includes("<style>")) {
      svg = svg.replace("</svg>", `${styleInject}</svg>`);
    }
    svg = svg.replace("<svg", '<svg class="ocl-svg"');
    if (displayOptions?.showMapping && svg.includes("data-atom-map-no")) {
      svg = addAtomMapHighlightCircles(svg);
    }
    return svg;
  } catch {
    return null;
  }
}
