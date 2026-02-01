"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Copy, Check, Download, ExternalLink, ShoppingCart, FileText, Pencil, ArrowLeftRight, Beaker, FlaskConical, TestTube, Search, Scale } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { ChemDepict } from "./ChemDepict";
import { useCachedSVG } from "@/hooks/useCachedSVG";
import { Molecule3DViewer } from "./Molecule3DViewer";
import { ArrowStyleSelector } from "./ArrowStyleSelector";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { MoleculeData, useChemStore } from "@/store/useChemStore";
import { DepictorOptions, Molecule, Reaction } from "openchemlib";
import { getPubChemUrl, getEMoleculesUrl, getGooglePatentsUrl, getReaxysUrl, getSciFinderUrl, getReactionAtomBalance, isReactionSmiles, parseReactionSmiles } from "@/utils/chemUtils";
import { downloadSVG, generateFilenameFromSmiles } from "@/utils/downloadUtils";

interface MoleculeDetailPanelProps {
    molecule: MoleculeData | null;
    open: boolean;
    onClose: () => void;
    onEdit?: (molecule: MoleculeData) => void;
    displayOptions?: DepictorOptions;
}

// Property row component with copy functionality - Linear style
function PropertyRow({
    label,
    value,
    unit = "",
    altUnit = "",
    altValue = null,
    decimals = 2
}: {
    label: string;
    value: number;
    unit?: string;
    altUnit?: string;
    altValue?: number | null;
    decimals?: number;
}) {
    const [copied, setCopied] = useState(false);
    const [useAltUnit, setUseAltUnit] = useState(false);

    const displayValue = useAltUnit && altValue !== null ? altValue : value;
    const displayUnit = useAltUnit ? altUnit : unit;
    const formattedValue = displayValue.toFixed(decimals);

    const handleCopy = () => {
        navigator.clipboard.writeText(`${formattedValue}${displayUnit ? ' ' + displayUnit : ''}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div 
            className="group flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={handleCopy}
        >
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium tabular-nums">
                    {formattedValue}
                    {displayUnit && <span className="text-muted-foreground ml-0.5">{displayUnit}</span>}
                </span>

                {altUnit && altValue !== null && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setUseAltUnit(!useAltUnit); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeftRight className="w-3 h-3" />
                    </button>
                )}

                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground">
                    {copied ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                        <Copy className="w-3 h-3" />
                    )}
                </span>
            </div>
        </div>
    );
}

export function MoleculeDetailPanel({ molecule, open, onClose, onEdit, displayOptions }: MoleculeDetailPanelProps) {
    const [view3D, setView3D] = useState(false);
    const [copiedSmiles, setCopiedSmiles] = useState(false);
    const [copiedComponentIndex, setCopiedComponentIndex] = useState<number | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const reactionArrowStyle = useChemStore((state) => state.reactionArrowStyle);
    const setReactionArrowStyle = useChemStore((state) => state.setReactionArrowStyle);

    const structureSvgReady = useCachedSVG(
        molecule?.smiles ?? "",
        400,
        350,
        displayOptions,
        reactionArrowStyle
    );

    // Lock body scroll when panel is open
    useEffect(() => {
        if (open) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            // Cleanup on unmount
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [open]);

    // Handle Escape key to close panel
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                onClose();
            }
        };

        if (open) {
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open, onClose]);

    // Parse reaction details - Daylight format (Reactants>Agents>Products) or multi-step (>>)
    const reactionDetails = useMemo(() => {
        if (!molecule) return null;

        const isReaction = isReactionSmiles(molecule.smiles);
        if (!isReaction) return null;

        const molecules: Array<{
            smiles: string;
            type: 'reactant' | 'agent' | 'intermediate' | 'product';
            atomCount: number;
            molecularWeight: number;
        }> = [];

        if (molecule.smiles.includes('>>')) {
            // Multi-step: each step can be a molecule or Daylight reaction (A>B or A>B>C)
            const steps = molecule.smiles.split('>>').filter((s) => s.trim().length > 0);
            steps.forEach((step, index) => {
                const stepType: 'reactant' | 'intermediate' | 'product' =
                    index === 0 ? 'reactant' : index === steps.length - 1 ? 'product' : 'intermediate';
                if (step.includes('>')) {
                    // Daylight reaction step: Reactants>Agents>Products
                    const reaction = parseReactionSmiles(step);
                    if (reaction) {
                        const isLastStep = index === steps.length - 1;
                        const reactantType = index === 0 ? 'reactant' : 'intermediate';
                        const productType = isLastStep ? 'product' : 'intermediate';
                        const add = (getMol: (i: number) => Molecule, count: number, type: 'reactant' | 'agent' | 'product' | 'intermediate') => {
                            for (let i = 0; i < count; i++) {
                                const mol = getMol(i);
                                molecules.push({
                                    smiles: mol.toSmiles(),
                                    type,
                                    atomCount: mol.getAllAtoms(),
                                    molecularWeight: mol.getMolweight(),
                                });
                            }
                        };
                        add((i) => reaction.getReactant(i), reaction.getReactants(), reactantType);
                        add((i) => reaction.getCatalyst(i), reaction.getCatalysts(), 'agent');
                        add((i) => reaction.getProduct(i), reaction.getProducts(), productType);
                    }
                } else {
                    try {
                        const mol = Molecule.fromSmiles(step);
                        molecules.push({
                            smiles: step,
                            type: stepType,
                            atomCount: mol.getAllAtoms(),
                            molecularWeight: mol.getMolweight(),
                        });
                    } catch {
                        /* skip invalid step */
                    }
                }
            });
        } else {
            // Daylight: Reactants>Products or Reactants>Agents>Products
            const reaction = parseReactionSmiles(molecule.smiles);
            if (!reaction) return null;
            const add = (getMol: (i: number) => Molecule, count: number, type: 'reactant' | 'agent' | 'product') => {
                for (let i = 0; i < count; i++) {
                    const mol = getMol(i);
                    molecules.push({
                        smiles: mol.toSmiles(),
                        type,
                        atomCount: mol.getAllAtoms(),
                        molecularWeight: mol.getMolweight(),
                    });
                }
            };
            add((i) => reaction.getReactant(i), reaction.getReactants(), 'reactant');
            add((i) => reaction.getCatalyst(i), reaction.getCatalysts(), 'agent');
            add((i) => reaction.getProduct(i), reaction.getProducts(), 'product');
        }

        const numSteps = molecule.smiles.includes('>>')
            ? molecule.smiles.split('>>').filter((s) => s.trim().length > 0).length
            : molecules.length;
        const atomBalance = getReactionAtomBalance(molecules);
        return {
            numSteps,
            molecules,
            totalAtoms: molecules.reduce((sum, m) => sum + m.atomCount, 0),
            atomBalance,
        };
    }, [molecule]);

    if (!molecule) return null;

    const isReaction = isReactionSmiles(molecule.smiles);

    const properties = molecule.properties;

    const handleCopySmiles = () => {
        navigator.clipboard.writeText(molecule.smiles);
        setCopiedSmiles(true);
        setTimeout(() => setCopiedSmiles(false), 2000);
    };

    const handleDownloadSVG = () => {
        if (svgContent) {
            const filename = generateFilenameFromSmiles(molecule.smiles, 'svg');
            downloadSVG(svgContent, filename);
        }
    };

    const handleDownloadMOL = () => {
        try {
            const mol = molecule.mol || Molecule.fromSmiles(molecule.smiles);
            const molfile = mol.toMolfile();
            const filename = generateFilenameFromSmiles(molecule.smiles, 'mol');
            const blob = new Blob([molfile], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Download failed
        }
    };

    const handleDownloadSDF = () => {
        try {
            const mol = molecule.mol || Molecule.fromSmiles(molecule.smiles);
            const molfile = mol.toMolfile();
            const filename = generateFilenameFromSmiles(molecule.smiles, 'sdf');
            const blob = new Blob([molfile], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Download failed
        }
    };

    const handleDownloadRXN = () => {
        try {
            const reaction = Reaction.fromSmiles(molecule.smiles);
            if (reaction.isEmpty()) return;
            const rxnContent = reaction.toRxn();
            const filename = generateFilenameFromSmiles(molecule.smiles, 'rxn');
            const blob = new Blob([rxnContent], { type: 'chemical/x-mdl-rxnfile' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // Download failed
        }
    };

    const handleCopyComponentSmiles = (smiles: string, index: number) => {
        navigator.clipboard.writeText(smiles);
        setCopiedComponentIndex(index);
        setTimeout(() => setCopiedComponentIndex(null), 1500);
    };

    return (
        <>
            {/* Backdrop - Modal Overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 z-[60]"
                    onClick={onClose}
                    style={{
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)' // Safari support
                    }}
                    aria-hidden="true"
                />
            )}

            {/* Centered Panel */}
            <div
                className={`fixed inset-4 md:inset-8 lg:inset-16 xl:inset-24 bg-card/95 backdrop-blur-xl border border-border/50 rounded-md shadow-2xl overflow-hidden transition-all duration-300 ease-out z-[70] ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full flex flex-col">
                    {/* Header - Linear Style */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 bg-muted/5">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <h2 className="text-sm font-semibold tracking-tight">{isReaction ? 'Reaction Details' : 'Molecule Details'}</h2>
                            <div className="hidden sm:flex items-center gap-2 flex-1 min-w-0">
                                <code className="text-xs bg-muted/50 px-2.5 py-1 rounded-md font-mono truncate border border-border/30">
                                    {molecule.smiles}
                                </code>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 flex-shrink-0 hover:bg-muted/80"
                                            onClick={handleCopySmiles}
                                        >
                                            {copiedSmiles ? (
                                                <Check className="w-3 h-3 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-3 h-3" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Copy SMILES</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-7 w-7 flex-shrink-0 hover:bg-muted/80 rounded-md"
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    {/* Mobile SMILES */}
                    <div className="sm:hidden px-4 py-2 border-b border-border/30 bg-muted/20">
                        <div className="flex items-center gap-2">
                            <code className="text-xs bg-background/80 px-2 py-1 rounded font-mono truncate flex-1 border border-border/30">
                                {molecule.smiles}
                            </code>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={handleCopySmiles}
                            >
                                {copiedSmiles ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Content - Responsive Layout */}
                    <div className="flex-1 overflow-hidden">
                        <div className="h-full flex flex-col lg:flex-row">
                            {/* Left: Structure Viewer (Reduced from 2/3 to 2/5) */}
                            <div className="flex-shrink-0 lg:w-2/5 lg:border-r border-b lg:border-b-0 border-border/30 p-4 overflow-auto bg-muted/5">
                                <div className="h-full flex flex-col">
                                    {/* 2D/3D Toggle or Arrow Style Selector + Edit Button */}
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            {isReaction ? "Reaction" : "Structure"}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {isReaction ? (
                                                <ArrowStyleSelector 
                                                    value={reactionArrowStyle} 
                                                    onChange={setReactionArrowStyle}
                                                />
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-0.5 bg-muted/30 rounded-md p-0.5 border border-border/30">
                                                        <Button
                                                            variant={!view3D ? "secondary" : "ghost"}
                                                            size="sm"
                                                            onClick={() => setView3D(false)}
                                                            className={`h-6 px-2.5 text-xs rounded-md transition-all ${!view3D ? "shadow-sm" : "hover:bg-muted/60"
                                                                }`}
                                                        >
                                                            2D
                                                        </Button>
                                                        <Button
                                                            variant={view3D ? "secondary" : "ghost"}
                                                            size="sm"
                                                            onClick={() => setView3D(true)}
                                                            className={`h-6 px-2.5 text-xs rounded-md transition-all ${view3D ? "shadow-sm" : "hover:bg-muted/60"
                                                                }`}
                                                        >
                                                            3D
                                                        </Button>
                                                    </div>
                                                    {onEdit && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => onEdit(molecule)}
                                                                    className="h-6 px-2.5 text-xs hover:bg-indigo-500/10 hover:text-indigo-500 hover:border-indigo-500/50 transition-all border-border/30"
                                                                >
                                                                    <Pencil className="w-3 h-3 mr-1.5" />
                                                                    Edit
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit structure in Ketcher</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Viewer */}
                                    <div className="flex-1 relative flex items-center justify-center bg-background/50 rounded-md border border-border/20 min-h-0 overflow-hidden">
                                        {!view3D || isReaction ? (
                                            <>
                                                <ChemDepict
                                                    smiles={molecule.smiles}
                                                    width={400}
                                                    height={350}
                                                    displayOptions={displayOptions}
                                                    arrowStyle={reactionArrowStyle}
                                                    onSVGGenerated={setSvgContent}
                                                />
                                                {!structureSvgReady && (
                                                    <div className="absolute inset-0 flex items-center justify-center p-4 bg-background/30 rounded-md transition-opacity duration-200" aria-hidden>
                                                        <div className="w-full max-w-[400px] aspect-[400/350] flex flex-col gap-3">
                                                            <Skeleton className="flex-1 w-full rounded-md" />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <Molecule3DViewer smiles={molecule.smiles} className="w-full h-full" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Properties & Actions (Expanded from 1/3 to 3/5) */}
                            <div className="flex-1 lg:w-3/5 p-4 sm:p-5 overflow-auto">
                                <div className="space-y-5">
                                    {/* Reaction Details - Linear Style */}
                                    {isReaction && reactionDetails ? (
                                        <>
                                            {/* Reaction Overview */}
                                            <div>
                                                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Overview</h3>
                                                <div className="flex flex-wrap gap-6">
                                                    <div>
                                                        <div className="text-2xl font-semibold tabular-nums">{reactionDetails.numSteps}</div>
                                                        <div className="text-[11px] text-muted-foreground">Steps</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-2xl font-semibold tabular-nums">{reactionDetails.totalAtoms}</div>
                                                        <div className="text-[11px] text-muted-foreground">Total Atoms</div>
                                                    </div>
                                                    {reactionDetails.atomBalance && (
                                                        <div className="flex items-center gap-2">
                                                            <Scale className={`w-5 h-5 ${reactionDetails.atomBalance.balanced ? "text-emerald-500" : "text-amber-500"}`} />
                                                            <div>
                                                                <div className={`text-sm font-medium ${reactionDetails.atomBalance.balanced ? "text-emerald-600" : "text-amber-600"}`}>
                                                                    {reactionDetails.atomBalance.label}
                                                                </div>
                                                                <div className="text-[11px] text-muted-foreground">Atom balance</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Reaction Steps */}
                                            <div>
                                                <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Molecules</h3>
                                                <div className="space-y-1">
                                                    {reactionDetails.molecules.map((mol, index) => (
                                                        <div key={index} className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors">
                                                            {mol.type === 'reactant' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-600">
                                                                    <Beaker className="w-2.5 h-2.5" />
                                                                    Reactant
                                                                </span>
                                                            )}
                                                            {mol.type === 'agent' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/15 text-slate-600">
                                                                    <TestTube className="w-2.5 h-2.5" />
                                                                    Agent
                                                                </span>
                                                            )}
                                                            {mol.type === 'intermediate' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-600">
                                                                    <TestTube className="w-2.5 h-2.5" />
                                                                    Intermediate
                                                                </span>
                                                            )}
                                                            {mol.type === 'product' && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/15 text-emerald-600">
                                                                    <FlaskConical className="w-2.5 h-2.5" />
                                                                    Product
                                                                </span>
                                                            )}
                                                            <code className="text-xs font-mono text-muted-foreground truncate flex-1 min-w-0">
                                                                {mol.smiles}
                                                            </code>
                                                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                                                                {mol.atomCount} atoms · {mol.molecularWeight.toFixed(1)} g/mol
                                                            </span>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                                                                        onClick={(e) => { e.stopPropagation(); handleCopyComponentSmiles(mol.smiles, index); }}
                                                                    >
                                                                        {copiedComponentIndex === index ? (
                                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                                        ) : (
                                                                            <Copy className="w-3 h-3" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Copy SMILES</TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Molecular Properties - Linear Style */}
                                            {properties && (
                                                <div>
                                                    <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Properties</h3>
                                                    <div className="space-y-0.5">
                                                        {properties.mw !== undefined && (
                                                            <PropertyRow
                                                                label="Molecular Weight"
                                                                value={properties.mw}
                                                                unit="g/mol"
                                                                altUnit="kDa"
                                                                altValue={properties.mw / 1000}
                                                                decimals={2}
                                                            />
                                                        )}
                                                        {properties.logP !== undefined && (
                                                            <PropertyRow
                                                                label="LogP"
                                                                value={properties.logP}
                                                                decimals={2}
                                                            />
                                                        )}
                                                        {properties.logS !== undefined && (
                                                            <PropertyRow
                                                                label="LogS"
                                                                value={properties.logS}
                                                                decimals={2}
                                                            />
                                                        )}
                                                        {properties.tpsa !== undefined && (
                                                            <PropertyRow
                                                                label="Polar Surface Area"
                                                                value={properties.tpsa}
                                                                unit="Å²"
                                                                altUnit="nm²"
                                                                altValue={properties.tpsa / 100}
                                                                decimals={1}
                                                            />
                                                        )}
                                                        {properties.acceptorCount !== undefined && (
                                                            <PropertyRow
                                                                label="H-Bond Acceptors"
                                                                value={properties.acceptorCount}
                                                                decimals={0}
                                                            />
                                                        )}
                                                        {properties.donorCount !== undefined && (
                                                            <PropertyRow
                                                                label="H-Bond Donors"
                                                                value={properties.donorCount}
                                                                decimals={0}
                                                            />
                                                        )}
                                                        {properties.rotatableBonds !== undefined && (
                                                            <PropertyRow
                                                                label="Rotatable Bonds"
                                                                value={properties.rotatableBonds}
                                                                decimals={0}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Actions - Compact Linear Style */}
                                    <div className="space-y-1">
                                        <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Actions</h3>
                                        
                                        {/* Export Actions */}
                                        <button
                                            onClick={handleDownloadSVG}
                                            disabled={!svgContent}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                            <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors">Download SVG</span>
                                        </button>
                                        
                                        {isReaction && (
                                            <button
                                                onClick={handleDownloadRXN}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors group"
                                            >
                                                <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors">Download RXN</span>
                                            </button>
                                        )}
                                        
                                        {!isReaction && (
                                            <>
                                                <button
                                                    onClick={handleDownloadMOL}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors group"
                                                >
                                                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                    <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors">Download MOL</span>
                                                </button>
                                                
                                                <button
                                                    onClick={handleDownloadSDF}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors group"
                                                >
                                                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                    <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors">Download SDF</span>
                                                </button>
                                            </>
                                        )}
                                        
                                        {/* Divider */}
                                        {!isReaction && <div className="h-px bg-border/50 my-2" />}
                                        
                                        {/* External Links */}
                                        {!isReaction && (
                                            <>
                                                <button
                                                    onClick={() => window.open(getPubChemUrl(molecule.smiles), "_blank")}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-blue-500/10 transition-colors group"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                                    <span className="flex-1 text-left text-muted-foreground group-hover:text-blue-500 transition-colors">Search PubChem</span>
                                                    <span className="text-[10px] text-muted-foreground/40">↗</span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => window.open(getEMoleculesUrl(molecule.smiles), "_blank")}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-emerald-500/10 transition-colors group"
                                                >
                                                    <ShoppingCart className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                                                    <span className="flex-1 text-left text-muted-foreground group-hover:text-emerald-500 transition-colors">Find on eMolecules</span>
                                                    <span className="text-[10px] text-muted-foreground/40">↗</span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => window.open(getGooglePatentsUrl(molecule.smiles), "_blank")}
                                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-amber-500/10 transition-colors group"
                                                >
                                                    <FileText className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                                                    <span className="flex-1 text-left text-muted-foreground group-hover:text-amber-500 transition-colors">Search Patents</span>
                                                    <span className="text-[10px] text-muted-foreground/40">↗</span>
                                                </button>
                                            </>
                                        )}
                                        
                                        {isReaction && (
                                            <>
                                                <div className="h-px bg-border/50 my-2" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(molecule.smiles);
                                                                window.open(getReaxysUrl(), "_blank");
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-violet-500/10 transition-colors group"
                                                        >
                                                            <Search className="w-4 h-4 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                                                            <span className="flex-1 text-left text-muted-foreground group-hover:text-violet-500 transition-colors">Search Reaxys</span>
                                                            <span className="text-[10px] text-muted-foreground/40">↗</span>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Reaction SMILES copied to clipboard; opens Reaxys (subscription required)</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(molecule.smiles);
                                                                window.open(getSciFinderUrl(), "_blank");
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-cyan-500/10 transition-colors group"
                                                        >
                                                            <Search className="w-4 h-4 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
                                                            <span className="flex-1 text-left text-muted-foreground group-hover:text-cyan-500 transition-colors">Search SciFinder</span>
                                                            <span className="text-[10px] text-muted-foreground/40">↗</span>
                                                        </button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Reaction SMILES copied to clipboard; opens SciFinder (subscription required)</TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
