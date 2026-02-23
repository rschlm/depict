"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Copy, Check, Download, ExternalLink, ShoppingCart, FileText, Pencil, Beaker, FlaskConical, TestTube, Search, Scale, Fingerprint, ImageDown, ShieldCheck, ShieldAlert, ShieldX, ChevronDown, ArrowRight } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { ChemDepict } from "./ChemDepict";
import { useCachedSVG } from "@/hooks/useCachedSVG";
import { Molecule3DViewer } from "./Molecule3DViewer";
import { ArrowStyleSelector } from "./ArrowStyleSelector";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { MoleculeData, useChemStore } from "@/store/useChemStore";
import { DepictorOptions, Molecule, Reaction } from "openchemlib";
import { getPubChemUrl, getEMoleculesUrl, getGooglePatentsUrl, getReaxysUrl, getSciFinderUrl, getReactionAtomBalance, isReactionSmiles, parseReactionSmiles, getRo5Details } from "@/utils/chemUtils";
import { downloadSVG, generateFilenameFromSmiles } from "@/utils/downloadUtils";
import { downloadPNG } from "@/utils/pngExport";

interface MoleculeDetailPanelProps {
    molecule: MoleculeData | null;
    open: boolean;
    onClose: () => void;
    onEdit?: (molecule: MoleculeData) => void;
    onFindSimilar?: (molecule: MoleculeData) => void;
    displayOptions?: DepictorOptions;
}

function MetricCard({ label, value, unit, onClick }: { label: string; value: string; unit?: string; onClick?: () => void }) {
    const [copied, setCopied] = useState(false);
    const handleClick = () => {
        if (onClick) { onClick(); return; }
        navigator.clipboard.writeText(`${value}${unit ? " " + unit : ""}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };
    return (
        <button
            onClick={handleClick}
            className="group flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 hover:border-border/50 transition-all text-left relative"
        >
            <span className="text-lg font-semibold tabular-nums leading-tight text-foreground">
                {value}
                {unit && <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
            <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            </span>
        </button>
    );
}

function ComponentCard({ mol, index, isSelected, onSelect, onCopy, copied }: {
    mol: { smiles: string; type: string; atomCount: number; molecularWeight: number };
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onCopy: () => void;
    copied: boolean;
}) {
    const typeColors: Record<string, string> = {
        reactant: "border-blue-500/30 bg-blue-500/5",
        agent: "border-slate-500/30 bg-slate-500/5",
        intermediate: "border-amber-500/30 bg-amber-500/5",
        product: "border-emerald-500/30 bg-emerald-500/5",
    };
    const typeLabelColors: Record<string, string> = {
        reactant: "text-blue-600 dark:text-blue-400",
        agent: "text-slate-600 dark:text-slate-400",
        intermediate: "text-amber-600 dark:text-amber-400",
        product: "text-emerald-600 dark:text-emerald-400",
    };
    const TypeIcon = mol.type === "product" ? FlaskConical : mol.type === "agent" ? TestTube : mol.type === "intermediate" ? TestTube : Beaker;

    return (
        <button
            onClick={onSelect}
            className={`group flex flex-col items-center gap-1 p-2 rounded-lg border transition-all min-w-[90px] max-w-[130px] ${typeColors[mol.type] || "border-border/30 bg-muted/20"} ${isSelected ? "ring-2 ring-primary/40 shadow-sm" : "hover:shadow-sm"}`}
        >
            <div className="w-[80px] h-[60px] flex items-center justify-center overflow-hidden">
                <ChemDepict smiles={mol.smiles} width={80} height={60} />
            </div>
            <div className={`flex items-center gap-0.5 text-[9px] font-medium uppercase tracking-wide ${typeLabelColors[mol.type] || "text-muted-foreground"}`}>
                <TypeIcon className="w-2.5 h-2.5" />
                {mol.type}
            </div>
            <code className="text-[9px] font-mono text-muted-foreground truncate max-w-full leading-tight">{mol.smiles.substring(0, 18)}{mol.smiles.length > 18 ? "..." : ""}</code>
            <span className="text-[10px] text-muted-foreground tabular-nums">{mol.molecularWeight.toFixed(1)} g/mol</span>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        onClick={(e) => { e.stopPropagation(); onCopy(); }}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted/60"
                    >
                        {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-muted-foreground" />}
                    </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Copy SMILES</TooltipContent>
            </Tooltip>
        </button>
    );
}

export function MoleculeDetailPanel({ molecule, open, onClose, onEdit, onFindSimilar, displayOptions }: MoleculeDetailPanelProps) {
    const [view3D, setView3D] = useState(false);
    const [selected3DComponent, setSelected3DComponent] = useState(0);
    const [copiedSmiles, setCopiedSmiles] = useState(false);
    const [copiedComponentIndex, setCopiedComponentIndex] = useState<number | null>(null);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [ro5Expanded, setRo5Expanded] = useState(false);
    const [smilesExpanded, setSmilesExpanded] = useState(false);
    const reactionArrowStyle = useChemStore((state) => state.reactionArrowStyle);
    const setReactionArrowStyle = useChemStore((state) => state.setReactionArrowStyle);

    useEffect(() => { setSelected3DComponent(0); setView3D(false); setSmilesExpanded(false); setRo5Expanded(false); }, [molecule?.id]);

    const structureSvgReady = useCachedSVG(molecule?.smiles ?? "", 400, 350, displayOptions, reactionArrowStyle);

    useEffect(() => {
        if (open) {
            const scrollY = window.scrollY;
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = "100%";
            document.body.style.overflow = "hidden";
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
            if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
        }
        return () => {
            document.body.style.position = "";
            document.body.style.top = "";
            document.body.style.width = "";
            document.body.style.overflow = "";
        };
    }, [open]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape" && open) onClose(); };
        if (open) document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    const reactionDetails = useMemo(() => {
        if (!molecule) return null;
        if (!isReactionSmiles(molecule.smiles)) return null;

        const molecules: Array<{ smiles: string; type: "reactant" | "agent" | "intermediate" | "product"; atomCount: number; molecularWeight: number }> = [];

        if (molecule.smiles.includes(">>")) {
            const steps = molecule.smiles.split(">>").filter((s) => s.trim().length > 0);
            steps.forEach((step, index) => {
                const stepType: "reactant" | "intermediate" | "product" = index === 0 ? "reactant" : index === steps.length - 1 ? "product" : "intermediate";
                if (step.includes(">")) {
                    const reaction = parseReactionSmiles(step);
                    if (reaction) {
                        const reactantType = index === 0 ? "reactant" : "intermediate";
                        const productType = index === steps.length - 1 ? "product" : "intermediate";
                        const add = (getMol: (i: number) => Molecule, count: number, type: "reactant" | "agent" | "product" | "intermediate") => {
                            for (let i = 0; i < count; i++) {
                                const mol = getMol(i);
                                molecules.push({ smiles: mol.toSmiles(), type, atomCount: mol.getAllAtoms(), molecularWeight: mol.getMolweight() });
                            }
                        };
                        add((i) => reaction.getReactant(i), reaction.getReactants(), reactantType);
                        add((i) => reaction.getCatalyst(i), reaction.getCatalysts(), "agent");
                        add((i) => reaction.getProduct(i), reaction.getProducts(), productType);
                    }
                } else {
                    const fragments = step.split(".").filter((s) => s.trim().length > 0);
                    for (const frag of fragments) {
                        try {
                            const mol = Molecule.fromSmiles(frag);
                            molecules.push({ smiles: frag, type: stepType, atomCount: mol.getAllAtoms(), molecularWeight: mol.getMolweight() });
                        } catch { /* skip */ }
                    }
                }
            });
        } else {
            const rawParts: string[] = [];
            let cur = "";
            let depth = 0;
            for (const ch of molecule.smiles) {
                if (ch === "[") depth++;
                else if (ch === "]") depth--;
                else if (ch === ">" && depth === 0) { rawParts.push(cur); cur = ""; continue; }
                cur += ch;
            }
            rawParts.push(cur);
            const nonEmpty = rawParts.map((p) => p.trim()).filter(Boolean);
            if (nonEmpty.length < 2) return null;
            const addFragments = (part: string, type: "reactant" | "agent" | "product") => {
                const frags = part.split(".").filter((s) => s.trim().length > 0);
                for (const frag of frags) {
                    try {
                        const mol = Molecule.fromSmiles(frag);
                        molecules.push({ smiles: frag, type, atomCount: mol.getAllAtoms(), molecularWeight: mol.getMolweight() });
                    } catch { /* skip */ }
                }
            };
            addFragments(nonEmpty[0], "reactant");
            if (nonEmpty.length > 2) nonEmpty.slice(1, -1).forEach((ap) => addFragments(ap, "agent"));
            addFragments(nonEmpty[nonEmpty.length - 1], "product");
        }

        const numSteps = molecule.smiles.includes(">>") ? molecule.smiles.split(">>").filter((s) => s.trim().length > 0).length : 1;
        const atomBalance = getReactionAtomBalance(molecules);
        return { numSteps, molecules, totalAtoms: molecules.reduce((sum, m) => sum + m.atomCount, 0), atomBalance };
    }, [molecule]);

    if (!molecule) return null;

    const isReaction = isReactionSmiles(molecule.smiles);
    const properties = molecule.properties;
    const rxnMeta = molecule.reactionMeta;
    const displayName = molecule.name || null;

    const handleCopySmiles = () => { navigator.clipboard.writeText(molecule.smiles); setCopiedSmiles(true); setTimeout(() => setCopiedSmiles(false), 2000); };
    const handleDownloadSVG = () => { if (svgContent) downloadSVG(svgContent, generateFilenameFromSmiles(molecule.smiles, "svg")); };
    const handleDownloadPNG = () => { if (svgContent) downloadPNG(svgContent, generateFilenameFromSmiles(molecule.smiles, "png")).catch(() => {}); };
    const handleDownloadMOL = () => { try { const mol = molecule.mol || Molecule.fromSmiles(molecule.smiles); const molfile = mol.toMolfile(); const blob = new Blob([molfile], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = generateFilenameFromSmiles(molecule.smiles, "mol"); a.click(); URL.revokeObjectURL(url); } catch { /* */ } };
    const handleDownloadSDF = () => { try { const mol = molecule.mol || Molecule.fromSmiles(molecule.smiles); const molfile = mol.toMolfile(); const blob = new Blob([molfile], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = generateFilenameFromSmiles(molecule.smiles, "sdf"); a.click(); URL.revokeObjectURL(url); } catch { /* */ } };
    const handleDownloadRXN = () => { try { const reaction = Reaction.fromSmiles(molecule.smiles); if (reaction.isEmpty()) return; const rxnContent = reaction.toRxn(); const blob = new Blob([rxnContent], { type: "chemical/x-mdl-rxnfile" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = generateFilenameFromSmiles(molecule.smiles, "rxn"); a.click(); URL.revokeObjectURL(url); } catch { /* */ } };
    const handleCopyComponentSmiles = (smiles: string, index: number) => { navigator.clipboard.writeText(smiles); setCopiedComponentIndex(index); setTimeout(() => setCopiedComponentIndex(null), 1500); };

    const reactants = reactionDetails?.molecules.filter((m) => m.type === "reactant") ?? [];
    const products = reactionDetails?.molecules.filter((m) => m.type === "product") ?? [];
    const agents = reactionDetails?.molecules.filter((m) => m.type === "agent") ?? [];
    const intermediates = reactionDetails?.molecules.filter((m) => m.type === "intermediate") ?? [];

    return (
        <>
            {open && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300 z-[60]"
                    onClick={onClose}
                    style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
                    aria-hidden="true"
                />
            )}

            <div
                className={`fixed inset-4 md:inset-8 lg:inset-12 xl:inset-20 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-out z-[70] ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full flex flex-col">
                    {/* ===== HEADER: Identity-first ===== */}
                    <div className="flex items-start justify-between px-6 py-4 border-b border-border/30">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold tracking-tight truncate">
                                    {displayName || (molecule.smiles.length > 50 ? molecule.smiles.substring(0, 50) + "..." : molecule.smiles)}
                                </h2>
                                {!isReaction && onEdit && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-indigo-500/10 hover:text-indigo-500" onClick={() => onEdit(molecule)}>
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit in Ketcher</TooltipContent>
                                    </Tooltip>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                                {isReaction && rxnMeta ? (
                                    <>
                                        <span>{rxnMeta.numReactants} &rarr; {rxnMeta.numProducts}</span>
                                        {rxnMeta.numSteps > 1 && <><span className="text-muted-foreground/30">&middot;</span><span>{rxnMeta.numSteps} steps</span></>}
                                        {rxnMeta.atomEconomy != null && (
                                            <><span className="text-muted-foreground/30">&middot;</span><span className={rxnMeta.atomEconomy >= 80 ? "text-emerald-600 dark:text-emerald-400" : rxnMeta.atomEconomy >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-500"}>AE {rxnMeta.atomEconomy.toFixed(0)}%</span></>
                                        )}
                                    </>
                                ) : properties ? (
                                    <>
                                        {properties.molecularFormula && <span className="font-mono" dangerouslySetInnerHTML={{ __html: properties.molecularFormula.replace(/(\d+)/g, "<sub>$1</sub>") }} />}
                                        {properties.mw != null && <><span className="text-muted-foreground/30">&middot;</span><span className="tabular-nums">{properties.mw.toFixed(2)} g/mol</span></>}
                                    </>
                                ) : null}
                            </div>
                            {/* Collapsible SMILES */}
                            <button onClick={() => setSmilesExpanded(!smilesExpanded)} className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                                <ChevronDown className={`w-3 h-3 transition-transform ${smilesExpanded ? "rotate-180" : ""}`} />
                                <span>SMILES</span>
                            </button>
                            {smilesExpanded && (
                                <div className="flex items-center gap-2 mt-1">
                                    <code className="text-xs bg-muted/40 px-2.5 py-1 rounded-md font-mono text-muted-foreground border border-border/20 truncate flex-1">{molecule.smiles}</code>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopySmiles}>
                                        {copiedSmiles ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                            {isReaction && !view3D && (
                                <ArrowStyleSelector value={reactionArrowStyle} onChange={setReactionArrowStyle} />
                            )}
                            <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5 border border-border/30">
                                <Button variant={!view3D ? "secondary" : "ghost"} size="sm" onClick={() => setView3D(false)} className={`h-7 px-3 text-xs rounded-md transition-all ${!view3D ? "shadow-sm" : "hover:bg-muted/60"}`}>2D</Button>
                                <Button variant={view3D ? "secondary" : "ghost"} size="sm" onClick={() => setView3D(true)} className={`h-7 px-3 text-xs rounded-md transition-all ${view3D ? "shadow-sm" : "hover:bg-muted/60"}`}>3D</Button>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:bg-muted/80 rounded-md">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ===== SCROLLABLE CONTENT ===== */}
                    <div className="flex-1 overflow-auto">
                        {/* Structure Viewer -- full width */}
                        {!view3D ? (
                            <div className="relative flex items-center justify-center bg-muted/5 border-b border-border/20" style={{ minHeight: 200, maxHeight: "42vh" }}>
                                <div className="py-4 px-6">
                                    <ChemDepict smiles={molecule.smiles} width={500} height={350} displayOptions={displayOptions} arrowStyle={reactionArrowStyle} onSVGGenerated={setSvgContent} className="mx-auto" />
                                </div>
                                {!structureSvgReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/30" aria-hidden>
                                        <Skeleton className="w-[400px] h-[280px] rounded-lg" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative bg-muted/5 border-b border-border/20 flex flex-col" style={{ height: "42vh", minHeight: 320 }}>
                                {isReaction && reactionDetails ? (
                                    <>
                                        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 bg-muted/20 shrink-0">
                                            <span className="text-[11px] text-muted-foreground font-medium">Component:</span>
                                            <select
                                                className="text-xs bg-background border border-border/30 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                                                value={selected3DComponent}
                                                onChange={(e) => setSelected3DComponent(Number(e.target.value))}
                                            >
                                                {reactionDetails.molecules.map((comp, i) => (
                                                    <option key={i} value={i}>
                                                        {comp.type.charAt(0).toUpperCase() + comp.type.slice(1)} {i + 1}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1 min-h-0">
                                            <Molecule3DViewer smiles={reactionDetails.molecules[Math.min(selected3DComponent, reactionDetails.molecules.length - 1)]?.smiles ?? molecule.smiles} className="w-full h-full" />
                                        </div>
                                    </>
                                ) : (
                                    <Molecule3DViewer smiles={molecule.smiles} className="w-full h-full" />
                                )}
                            </div>
                        )}

                        {/* Properties / Reaction info below structure */}
                        <div className="px-6 py-5 space-y-5">
                            {/* === MOLECULE PROPERTIES === */}
                            {!isReaction && properties && (
                                <>
                                    {/* Metric Dashboard Grid */}
                                    <div>
                                        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Properties</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {properties.mw != null && <MetricCard label="Molecular Weight" value={properties.mw.toFixed(2)} unit="g/mol" />}
                                            {properties.logP != null && <MetricCard label="LogP" value={properties.logP.toFixed(2)} />}
                                            {properties.logS != null && <MetricCard label="LogS" value={properties.logS.toFixed(2)} />}
                                            {properties.tpsa != null && <MetricCard label="TPSA" value={properties.tpsa.toFixed(1)} unit="A²" />}
                                            {properties.donorCount != null && <MetricCard label="H-Bond Donors" value={String(properties.donorCount)} />}
                                            {properties.acceptorCount != null && <MetricCard label="H-Bond Acceptors" value={String(properties.acceptorCount)} />}
                                            {properties.rotatableBonds != null && <MetricCard label="Rotatable Bonds" value={String(properties.rotatableBonds)} />}
                                            {properties.stereoCenterCount != null && <MetricCard label="Stereo Centers" value={String(properties.stereoCenterCount)} />}
                                        </div>
                                    </div>

                                    {/* Ro5 Compact Inline */}
                                    {properties.ro5Violations !== undefined && (() => {
                                        const ro5 = getRo5Details(properties);
                                        const v = properties.ro5Violations;
                                        const Icon = v === 0 ? ShieldCheck : v === 1 ? ShieldAlert : ShieldX;
                                        const color = v === 0 ? "text-emerald-500" : v === 1 ? "text-amber-500" : "text-red-500";
                                        const bgColor = v === 0 ? "bg-emerald-500/8" : v === 1 ? "bg-amber-500/8" : "bg-red-500/8";
                                        return (
                                            <div>
                                                <button
                                                    onClick={() => setRo5Expanded(!ro5Expanded)}
                                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg ${bgColor} border border-border/20 hover:border-border/40 transition-all`}
                                                >
                                                    <Icon className={`w-4 h-4 ${color}`} />
                                                    <span className={`text-sm font-medium ${color}`}>
                                                        {v === 0 ? "Passes Lipinski Ro5" : `${v} Ro5 violation${v > 1 ? "s" : ""}`}
                                                    </span>
                                                    <ChevronDown className={`w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform ${ro5Expanded ? "rotate-180" : ""}`} />
                                                </button>
                                                {ro5Expanded && (
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2">
                                                        {([
                                                            ["MW ≤ 500", ro5.mw, `${properties.mw.toFixed(0)}`],
                                                            ["LogP ≤ 5", ro5.logP, properties.logP.toFixed(2)],
                                                            ["HBD ≤ 5", ro5.hbd, String(properties.donorCount)],
                                                            ["HBA ≤ 10", ro5.hba, String(properties.acceptorCount)],
                                                        ] as const).map(([label, pass, val]) => (
                                                            <div key={label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${pass ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
                                                                <span className="font-semibold">{pass ? "✓" : "✗"}</span>
                                                                <span className="flex-1">{label}</span>
                                                                <span className="font-mono text-[11px]">{val}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}

                            {/* === REACTION DETAILS === */}
                            {isReaction && reactionDetails && (
                                <>
                                    {/* Reaction overview metrics */}
                                    <div>
                                        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Overview</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <MetricCard label="Steps" value={String(reactionDetails.numSteps)} />
                                            <MetricCard label="Reactants" value={String(reactants.length)} />
                                            <MetricCard label="Products" value={String(products.length)} />
                                            <MetricCard label="Total Atoms" value={String(reactionDetails.totalAtoms)} />
                                        </div>
                                    </div>

                                    {/* Atom balance + economy bar */}
                                    {(reactionDetails.atomBalance || (rxnMeta?.atomEconomy != null)) && (
                                        <div className="flex flex-wrap items-center gap-3">
                                            {reactionDetails.atomBalance && (
                                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-border/20 ${reactionDetails.atomBalance.balanced ? "bg-emerald-500/8" : "bg-amber-500/8"}`}>
                                                    <Scale className={`w-4 h-4 ${reactionDetails.atomBalance.balanced ? "text-emerald-500" : "text-amber-500"}`} />
                                                    <span className={`text-sm font-medium ${reactionDetails.atomBalance.balanced ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{reactionDetails.atomBalance.label}</span>
                                                </div>
                                            )}
                                            {rxnMeta?.hasAtomMap && (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-500/20 bg-violet-500/8">
                                                    <Fingerprint className="w-4 h-4 text-violet-500" />
                                                    <span className="text-sm font-medium text-violet-600 dark:text-violet-400">Atom-mapped</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Component flow diagram */}
                                    <div>
                                        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2.5">Components</h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {reactants.map((mol, i) => {
                                                const globalIdx = reactionDetails.molecules.indexOf(mol);
                                                return (
                                                    <div key={`r-${i}`} className="flex items-center gap-2">
                                                        {i > 0 && <span className="text-lg text-muted-foreground/50 font-light">+</span>}
                                                        <ComponentCard
                                                            mol={mol}
                                                            index={globalIdx}
                                                            isSelected={view3D && selected3DComponent === globalIdx}
                                                            onSelect={() => { if (view3D) setSelected3DComponent(globalIdx); }}
                                                            onCopy={() => handleCopyComponentSmiles(mol.smiles, globalIdx)}
                                                            copied={copiedComponentIndex === globalIdx}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <div className="flex flex-col items-center gap-0.5 px-2">
                                                <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                                                {agents.length > 0 && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        {agents.map((a, i) => (
                                                            <code key={i} className="text-[9px] font-mono text-muted-foreground/60 max-w-[80px] truncate">{a.smiles.substring(0, 12)}</code>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {products.map((mol, i) => {
                                                const globalIdx = reactionDetails.molecules.indexOf(mol);
                                                return (
                                                    <div key={`p-${i}`} className="flex items-center gap-2">
                                                        {i > 0 && <span className="text-lg text-muted-foreground/50 font-light">+</span>}
                                                        <ComponentCard
                                                            mol={mol}
                                                            index={globalIdx}
                                                            isSelected={view3D && selected3DComponent === globalIdx}
                                                            onSelect={() => { if (view3D) setSelected3DComponent(globalIdx); }}
                                                            onCopy={() => handleCopyComponentSmiles(mol.smiles, globalIdx)}
                                                            copied={copiedComponentIndex === globalIdx}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {intermediates.length > 0 && (
                                            <div className="mt-3">
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Intermediates</span>
                                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                    {intermediates.map((mol, i) => {
                                                        const globalIdx = reactionDetails.molecules.indexOf(mol);
                                                        return (
                                                            <ComponentCard
                                                                key={`int-${i}`}
                                                                mol={mol}
                                                                index={globalIdx}
                                                                isSelected={view3D && selected3DComponent === globalIdx}
                                                                onSelect={() => { if (view3D) setSelected3DComponent(globalIdx); }}
                                                                onCopy={() => handleCopyComponentSmiles(mol.smiles, globalIdx)}
                                                                copied={copiedComponentIndex === globalIdx}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Custom Properties */}
                            {molecule.customProperties && Object.keys(molecule.customProperties).length > 0 && (
                                <div>
                                    <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Imported Data</h3>
                                    <div className="rounded-lg border border-border/30 overflow-hidden">
                                        {Object.entries(molecule.customProperties).map(([key, value], idx) => (
                                            <div key={key} className={`flex items-center justify-between gap-4 px-3 py-1.5 text-xs ${idx % 2 === 0 ? "bg-muted/20" : ""}`}>
                                                <span className="text-muted-foreground truncate">{key}</span>
                                                <span className="font-mono text-foreground/80 truncate text-right">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* === ACTIONS === */}
                            <div className="space-y-3 pt-1">
                                {/* Find Similar */}
                                {!isReaction && onFindSimilar && molecule.mol && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start gap-2.5 h-9 text-sm hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/40 transition-all"
                                        onClick={() => { onFindSimilar(molecule); onClose(); }}
                                    >
                                        <Fingerprint className="w-4 h-4" />
                                        Find similar molecules
                                    </Button>
                                )}

                                {/* Export row */}
                                <div>
                                    <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Export</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadSVG} disabled={!svgContent}>
                                            <Download className="w-3 h-3" /> SVG
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadPNG} disabled={!svgContent}>
                                            <ImageDown className="w-3 h-3" /> PNG
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleCopySmiles}>
                                            {copiedSmiles ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                            {copiedSmiles ? "Copied" : "SMILES"}
                                        </Button>
                                        {isReaction ? (
                                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadRXN}>
                                                <Download className="w-3 h-3" /> RXN
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadMOL}>
                                                    <Download className="w-3 h-3" /> MOL
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleDownloadSDF}>
                                                    <Download className="w-3 h-3" /> SDF
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* External links */}
                                <div>
                                    <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Search</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {isReaction ? (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30" onClick={() => { navigator.clipboard.writeText(molecule.smiles); window.open(getReaxysUrl(), "_blank"); }}>
                                                            <Search className="w-3 h-3" /> Reaxys <span className="text-[9px] text-muted-foreground/40">↗</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">SMILES copied; opens Reaxys</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-cyan-500/10 hover:text-cyan-600 hover:border-cyan-500/30" onClick={() => { navigator.clipboard.writeText(molecule.smiles); window.open(getSciFinderUrl(), "_blank"); }}>
                                                            <Search className="w-3 h-3" /> SciFinder <span className="text-[9px] text-muted-foreground/40">↗</span>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">SMILES copied; opens SciFinder</TooltipContent>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30" onClick={() => window.open(getPubChemUrl(molecule.smiles), "_blank")}>
                                                    <ExternalLink className="w-3 h-3" /> PubChem <span className="text-[9px] text-muted-foreground/40">↗</span>
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30" onClick={() => window.open(getEMoleculesUrl(molecule.smiles), "_blank")}>
                                                    <ShoppingCart className="w-3 h-3" /> eMolecules <span className="text-[9px] text-muted-foreground/40">↗</span>
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30" onClick={() => window.open(getGooglePatentsUrl(molecule.smiles), "_blank")}>
                                                    <FileText className="w-3 h-3" /> Patents <span className="text-[9px] text-muted-foreground/40">↗</span>
                                                </Button>
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
