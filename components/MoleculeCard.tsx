"use client";

import { useState, memo } from "react";
import { ExternalLink, FlaskConical, FileText, ShoppingCart, Copy, Check, Weight, Droplet, Download, Pin, Code, Fingerprint, ImageDown, ShieldCheck, ShieldAlert, ShieldX, ArrowRight, Scale, Layers } from "lucide-react";
import { ChemDepict } from "./ChemDepict";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  getPubChemUrl,
  getEMoleculesUrl,
  getGooglePatentsUrl,
  getReaxysUrl,
  getSciFinderUrl,
} from "@/utils/chemUtils";
import { downloadSVG, generateFilenameFromSmiles } from "@/utils/downloadUtils";
import { downloadPNG } from "@/utils/pngExport";
import { MoleculeData } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";
import { useChemStore } from "@/store/useChemStore";

interface MoleculeCardProps {
  molecule: MoleculeData;
  displayOptions?: DepictorOptions;
  hideActionButtons?: boolean;
  hideProperties?: boolean;
  structureWidth?: number;
  structureHeight?: number;
  cardWidth?: number;
  onCardClick?: () => void;
  onMoleculeHover?: (molecule: MoleculeData | null) => void;
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  onFindSimilar?: (molecule: MoleculeData) => void;
  similarityScore?: number | null;
}

const COMPACT_BREAKPOINT = 240;

export const MoleculeCard = memo(function MoleculeCard({ molecule, displayOptions, hideActionButtons = false, hideProperties = false, structureWidth = 220, structureHeight = 160, cardWidth = 260, onCardClick, onMoleculeHover, isSelected = false, onSelect, onFindSimilar, similarityScore }: MoleculeCardProps) {
  const compact = cardWidth < COMPACT_BREAKPOINT;
  const [copied, setCopied] = useState(false);
  const [svgCopied, setSvgCopied] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const { pinnedMolecules, pinMolecule, unpinMolecule, reactionArrowStyle } = useChemStore();
  const isPinned = pinnedMolecules.some((m) => m.id === molecule.id);

  const isReaction = molecule.isReaction;
  const rxnMeta = molecule.reactionMeta;
  const properties = molecule.properties;
  const logP = properties?.logP ?? null;
  const mw = properties?.mw ?? null;
  const isSafeLogP = logP !== null && logP < 5;

  const handleCopySmiles = async () => {
    try {
      await navigator.clipboard.writeText(molecule.smiles);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  };

  const handleDownloadSVG = () => {
    if (svgContent) {
      const filename = generateFilenameFromSmiles(molecule.smiles, 'svg');
      downloadSVG(svgContent, filename);
    }
  };

  const handleDownloadPNG = () => {
    if (svgContent) {
      const filename = generateFilenameFromSmiles(molecule.smiles, 'png');
      downloadPNG(svgContent, filename).catch(() => {});
    }
  };

  const handleCopySVG = async () => {
    if (!svgContent) return;
    try {
      await navigator.clipboard.writeText(svgContent);
      setSvgCopied(true);
      setTimeout(() => setSvgCopied(false), 2000);
    } catch {
      // Copy failed
    }
  };

  const handlePin = () => {
    if (isPinned) {
      unpinMolecule(molecule.id);
    } else {
      pinMolecule(molecule);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect && (e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.stopPropagation();
      onSelect(e);
      return;
    }
    onCardClick?.();
  };

  return (
    <div
      className={`group relative flex flex-col h-full bg-card border rounded-md overflow-hidden hover:border-border hover:shadow-sm transition-all duration-200 cursor-pointer ${isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}
      onClick={handleCardClick}
      onMouseEnter={() => onMoleculeHover?.(molecule)}
      onMouseLeave={() => onMoleculeHover?.(null)}
    >
      {/* Selection Checkbox - Top Left; visible on hover or when selected */}
      {onSelect && (
        <div
          className={`absolute z-10 flex items-center justify-center transition-opacity duration-200 ${compact ? "top-1 left-1" : "top-2 left-2"} ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onSelect(e);
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-pointer">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => {}}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <span className="text-xs">{isSelected ? "Deselect" : "Select"} (Shift-click for range)</span>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Type Badge - Top Left below checkbox */}
      {isReaction && (
        <div className={`absolute z-10 ${compact ? "top-1 left-6" : "top-2 left-9"} ${onSelect ? "" : compact ? "left-1" : "left-2"}`}>
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-[18px] gap-0.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 backdrop-blur-sm">
            <ArrowRight className="w-2.5 h-2.5" />
            {rxnMeta && rxnMeta.numSteps > 1 ? `${rxnMeta.numSteps}-step` : "Rxn"}
          </Badge>
        </div>
      )}

      {/* Pin Button - Top Right */}
      <div className={`absolute z-10 transition-opacity duration-200 ${compact ? "top-1 right-1" : "top-2 right-2"} ${isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`bg-background/80 backdrop-blur-sm border transition-all ${compact ? "h-5 w-5" : "h-7 w-7"} ${isPinned
                ? "border-indigo-500 text-indigo-500 hover:bg-indigo-500/10"
                : "border-border/60 hover:bg-muted/60 hover:border-border"
                }`}
              onClick={(e) => {
                e.stopPropagation();
                handlePin();
              }}
            >
              <Pin className={`transition-transform ${compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} ${isPinned ? "fill-current rotate-45" : ""}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isPinned ? "Unpin from Comparator" : "Pin to Comparator"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Structure Rendering */}
      <div className={`bg-muted/20 min-h-0 flex-shrink overflow-hidden ${compact ? "p-2" : "p-4"}`}>
        <ChemDepict
          smiles={molecule.smiles}
          width={structureWidth}
          height={structureHeight}
          className="mx-auto"
          displayOptions={displayOptions}
          arrowStyle={reactionArrowStyle}
          onSVGGenerated={setSvgContent}
        />
      </div>

      {/* Properties Footer */}
      <div className={`flex flex-col flex-1 min-w-0 border-t border-border/60 bg-card ${compact ? "min-h-[76px] px-2 pt-1.5 pb-1.5" : "min-h-[100px] px-3 pt-2.5 pb-2.5"}`}>
        <div className={`flex items-center gap-1.5 ${compact ? "mb-1" : "mb-2"}`}>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <FlaskConical className={`shrink-0 text-muted-foreground/60 ${compact ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
            <span className={`font-mono text-muted-foreground/80 truncate ${compact ? "text-[9px]" : "text-[10px]"}`}>{molecule.smiles}</span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 ${compact ? "h-4 w-4" : "h-5 w-5"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopySmiles();
                }}
              >
                {copied ? (
                  <Check className={compact ? "w-2.5 h-2.5 text-emerald-500" : "w-3 h-3 text-emerald-500"} />
                ) : (
                  <Copy className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {copied ? "Copied!" : "Copy SMILES"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Reaction-specific property chips */}
        {!hideProperties && isReaction && rxnMeta && (
          <div className={`flex flex-wrap items-center ${compact ? "gap-1 mb-1" : "gap-1.5 mb-2"}`}>
            <div className={`flex items-center rounded bg-muted/30 ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"}`}>
              <Layers className={`text-muted-foreground ${compact ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
              <span className={`font-sans text-muted-foreground ${compact ? "text-[9px]" : "text-[10px]"}`}>{rxnMeta.numReactants}→{rxnMeta.numProducts}</span>
            </div>
            {rxnMeta.atomEconomy != null && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center rounded ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"} ${rxnMeta.atomEconomy >= 80 ? "bg-emerald-500/10" : rxnMeta.atomEconomy >= 50 ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                    <Scale className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} ${rxnMeta.atomEconomy >= 80 ? "text-emerald-500" : rxnMeta.atomEconomy >= 50 ? "text-amber-500" : "text-red-500"}`} />
                    <span className={`font-mono font-medium ${compact ? "text-[9px]" : "text-[10px]"} ${rxnMeta.atomEconomy >= 80 ? "text-emerald-500" : rxnMeta.atomEconomy >= 50 ? "text-amber-500" : "text-red-500"}`}>
                      AE {rxnMeta.atomEconomy.toFixed(0)}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="text-xs">Atom Economy: {rxnMeta.atomEconomy.toFixed(1)}%</span>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center rounded ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"} ${rxnMeta.isBalanced ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                  {rxnMeta.isBalanced ? (
                    <ShieldCheck className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-emerald-500`} />
                  ) : (
                    <ShieldAlert className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-amber-500`} />
                  )}
                  <span className={`font-sans font-medium ${compact ? "text-[9px]" : "text-[10px]"} ${rxnMeta.isBalanced ? "text-emerald-500" : "text-amber-500"}`}>
                    {rxnMeta.isBalanced ? "Bal." : "Unbal."}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <span className="text-xs">{rxnMeta.balanceLabel}</span>
              </TooltipContent>
            </Tooltip>
            {rxnMeta.hasAtomMap && (
              <div className={`flex items-center rounded bg-violet-500/10 ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"}`}>
                <Fingerprint className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-violet-500`} />
                <span className={`font-sans font-medium text-violet-500 ${compact ? "text-[9px]" : "text-[10px]"}`}>Mapped</span>
              </div>
            )}
          </div>
        )}

        {/* Molecule property chips */}
        {!hideProperties && !isReaction && properties && (
          <div className={`flex flex-wrap items-center ${compact ? "gap-1 mb-1" : "gap-1.5 mb-2"}`}>
            {properties.molecularFormula && (
              <div className={`flex items-center rounded bg-muted/30 ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"}`}>
                <span className={`font-mono text-foreground font-medium ${compact ? "text-[9px]" : "text-[10px]"}`}
                  dangerouslySetInnerHTML={{ __html: properties.molecularFormula.replace(/(\d+)/g, '<sub>$1</sub>') }}
                />
              </div>
            )}
            {mw !== null && (
              <div className={`flex items-center rounded bg-muted/30 ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"}`}>
                <Weight className={`text-muted-foreground ${compact ? "w-2 h-2" : "w-2.5 h-2.5"}`} />
                <span className={`text-muted-foreground font-sans ${compact ? "text-[9px]" : "text-[10px]"}`}>MW:</span>
                <span className={`font-mono text-foreground font-medium ${compact ? "text-[9px]" : "text-[10px]"}`}>
                  {mw.toFixed(2)}
                </span>
              </div>
            )}
            {logP !== null && (
              <div className={`flex items-center rounded ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"} ${isSafeLogP ? "bg-emerald-500/10" : "bg-muted/30"
                }`}>
                <Droplet className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} ${isSafeLogP ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span className={`font-sans ${compact ? "text-[9px]" : "text-[10px]"} ${isSafeLogP ? "text-emerald-500" : "text-muted-foreground"}`}>LogP:</span>
                <span
                  className={`font-mono font-medium ${compact ? "text-[9px]" : "text-[10px]"} ${isSafeLogP ? "text-emerald-500" : "text-foreground"
                    }`}
                >
                  {logP.toFixed(2)}
                </span>
              </div>
            )}
            {properties.ro5Violations !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center rounded ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"} ${
                    properties.ro5Violations === 0 ? "bg-emerald-500/10" : properties.ro5Violations === 1 ? "bg-amber-500/10" : "bg-red-500/10"
                  }`}>
                    {properties.ro5Violations === 0 ? (
                      <ShieldCheck className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-emerald-500`} />
                    ) : properties.ro5Violations === 1 ? (
                      <ShieldAlert className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-amber-500`} />
                    ) : (
                      <ShieldX className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-red-500`} />
                    )}
                    <span className={`font-sans font-medium ${compact ? "text-[9px]" : "text-[10px]"} ${
                      properties.ro5Violations === 0 ? "text-emerald-500" : properties.ro5Violations === 1 ? "text-amber-500" : "text-red-500"
                    }`}>
                      Ro5
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span className="text-xs">
                    {properties.ro5Violations === 0 ? "Passes Lipinski Rule of 5" : `${properties.ro5Violations} Ro5 violation${properties.ro5Violations > 1 ? "s" : ""}`}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
            {similarityScore != null && similarityScore > 0 && (
              <div className={`flex items-center rounded bg-violet-500/10 ${compact ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-0.5"}`}>
                <Fingerprint className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} text-violet-500`} />
                <span className={`font-mono font-medium text-violet-500 ${compact ? "text-[9px]" : "text-[10px]"}`}>
                  {(similarityScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!hideActionButtons && (
          <div className={`flex flex-wrap items-center gap-1 mt-auto ${compact ? "pt-0.5" : "pt-1"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); handleCopySVG(); }} disabled={!svgContent}>
                  {svgCopied ? <Check className={compact ? "w-2.5 h-2.5 text-emerald-500" : "w-3.5 h-3.5 text-emerald-500"} /> : <Code className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><span className="text-xs">{svgCopied ? "Copied!" : "Copy SVG"}</span></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); handleDownloadSVG(); }} disabled={!svgContent}>
                  <Download className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><span className="text-xs">Download SVG</span></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); handleDownloadPNG(); }} disabled={!svgContent}>
                  <ImageDown className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><span className="text-xs">Download PNG</span></TooltipContent>
            </Tooltip>

            {!isReaction && onFindSimilar && molecule.mol && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={`hover:bg-violet-500/10 hover:text-violet-500 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); onFindSimilar(molecule); }}>
                    <Fingerprint className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><span className="text-xs">Find similar</span></TooltipContent>
              </Tooltip>
            )}

            {/* External links: different for reactions vs molecules */}
            {isReaction ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); window.open(getReaxysUrl(), "_blank"); }}>
                      <ExternalLink className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><span className="text-xs">Reaxys</span></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); window.open(getSciFinderUrl(), "_blank"); }}>
                      <FileText className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><span className="text-xs">SciFinder</span></TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); window.open(getPubChemUrl(molecule.smiles), "_blank"); }}>
                      <ExternalLink className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><span className="text-xs">PubChem</span></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); window.open(getEMoleculesUrl(molecule.smiles), "_blank"); }}>
                      <ShoppingCart className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><span className="text-xs">eMolecules</span></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={`hover:bg-muted/60 transition-colors ${compact ? "h-5 w-5" : "h-7 w-7"}`} onClick={(e) => { e.stopPropagation(); window.open(getGooglePatentsUrl(molecule.smiles), "_blank"); }}>
                      <FileText className={compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top"><span className="text-xs">Google Patents</span></TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.molecule.id === nextProps.molecule.id &&
    prevProps.molecule.smiles === nextProps.molecule.smiles &&
    prevProps.molecule.properties === nextProps.molecule.properties &&
    prevProps.molecule.isReaction === nextProps.molecule.isReaction &&
    prevProps.molecule.reactionMeta === nextProps.molecule.reactionMeta &&
    prevProps.onCardClick === nextProps.onCardClick &&
    prevProps.structureWidth === nextProps.structureWidth &&
    prevProps.structureHeight === nextProps.structureHeight &&
    prevProps.cardWidth === nextProps.cardWidth &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.similarityScore === nextProps.similarityScore &&
    prevProps.onFindSimilar === nextProps.onFindSimilar &&
    JSON.stringify(prevProps.displayOptions) === JSON.stringify(nextProps.displayOptions)
  );
});
