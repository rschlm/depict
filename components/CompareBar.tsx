"use client";

import { useState } from "react";
import { X, ArrowLeftRight, ChevronUp, ChevronDown, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { ChemDepict } from "./ChemDepict";
import { Button } from "./ui/button";
import { useChemStore } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";
import type { MoleculeProperty } from "@/utils/chemUtils";

interface CompareBarProps {
    displayOptions?: DepictorOptions;
}

const COMPARE_ROWS: Array<{ label: string; key: keyof MoleculeProperty; unit?: string; decimals?: number; lowerIsBetter?: boolean }> = [
    { label: "Formula", key: "molecularFormula" },
    { label: "MW", key: "mw", unit: "g/mol", decimals: 2, lowerIsBetter: true },
    { label: "LogP", key: "logP", decimals: 2, lowerIsBetter: true },
    { label: "LogS", key: "logS", decimals: 2 },
    { label: "TPSA", key: "tpsa", unit: "Å²", decimals: 1 },
    { label: "HBD", key: "donorCount", decimals: 0, lowerIsBetter: true },
    { label: "HBA", key: "acceptorCount", decimals: 0, lowerIsBetter: true },
    { label: "Rot. bonds", key: "rotatableBonds", decimals: 0, lowerIsBetter: true },
    { label: "Stereo", key: "stereoCenterCount", decimals: 0 },
    { label: "Ro5 viol.", key: "ro5Violations", decimals: 0, lowerIsBetter: true },
];

export function CompareBar({ displayOptions }: CompareBarProps) {
    const { pinnedMolecules, unpinMolecule, clearPinnedMolecules, reactionArrowStyle } = useChemStore();
    const [expanded, setExpanded] = useState(false);

    if (pinnedMolecules.length === 0) {
        return null;
    }

    const pA = pinnedMolecules[0]?.properties;
    const pB = pinnedMolecules[1]?.properties;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-indigo-500" />
                        <h3 className="font-semibold text-sm text-foreground">
                            Comparator
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            ({pinnedMolecules.length}/2)
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {pinnedMolecules.length === 2 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={() => setExpanded(!expanded)}>
                                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted" onClick={clearPinnedMolecules}>
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pinnedMolecules.map((molecule, index) => (
                        <div
                            key={molecule.id}
                            className="relative bg-card border border-border/60 rounded-md overflow-hidden hover:border-border transition-all"
                        >
                            <button
                                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full p-1 hover:bg-muted/60 transition-colors"
                                onClick={() => unpinMolecule(molecule.id)}
                            >
                                <X className="w-3 h-3" />
                            </button>

                            <div className="absolute top-2 left-2 z-10 bg-indigo-500/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                                {index === 0 ? "Molecule A" : "Molecule B"}
                            </div>

                            <div className="flex flex-col">
                                <div className="p-4 bg-muted/20 flex items-center justify-center">
                                    <ChemDepict
                                        smiles={molecule.smiles}
                                        width={200}
                                        height={140}
                                        displayOptions={displayOptions}
                                        arrowStyle={reactionArrowStyle}
                                    />
                                </div>

                                <div className="px-3 py-2 border-t border-border/60 bg-card">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                                            {molecule.smiles}
                                        </span>
                                    </div>

                                    {molecule.properties && (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {molecule.properties.molecularFormula && (
                                                <div className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded">
                                                    <span className="text-[10px] font-mono text-foreground font-medium"
                                                        dangerouslySetInnerHTML={{ __html: molecule.properties.molecularFormula.replace(/(\d+)/g, '<sub>$1</sub>') }}
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded">
                                                <span className="text-[10px] text-muted-foreground font-sans">MW:</span>
                                                <span className="text-[10px] font-mono text-foreground font-medium">
                                                    {molecule.properties.mw.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${molecule.properties.logP < 5 ? "bg-emerald-500/10" : "bg-muted/30"}`}>
                                                <span className={`text-[10px] font-sans ${molecule.properties.logP < 5 ? "text-emerald-500" : "text-muted-foreground"}`}>LogP:</span>
                                                <span className={`text-[10px] font-mono font-medium ${molecule.properties.logP < 5 ? "text-emerald-500" : "text-foreground"}`}>
                                                    {molecule.properties.logP.toFixed(2)}
                                                </span>
                                            </div>
                                            {molecule.properties.ro5Violations !== undefined && (
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                                    molecule.properties.ro5Violations === 0 ? "bg-emerald-500/10" : molecule.properties.ro5Violations === 1 ? "bg-amber-500/10" : "bg-red-500/10"
                                                }`}>
                                                    {molecule.properties.ro5Violations === 0 ? <ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> : molecule.properties.ro5Violations === 1 ? <ShieldAlert className="w-2.5 h-2.5 text-amber-500" /> : <ShieldX className="w-2.5 h-2.5 text-red-500" />}
                                                    <span className={`text-[10px] font-sans font-medium ${
                                                        molecule.properties.ro5Violations === 0 ? "text-emerald-500" : molecule.properties.ro5Violations === 1 ? "text-amber-500" : "text-red-500"
                                                    }`}>Ro5</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {pinnedMolecules.length === 1 && (
                        <div className="bg-card border border-dashed border-border/60 rounded-md flex items-center justify-center h-full min-h-[200px]">
                            <div className="text-center p-6">
                                <div className="mb-2 text-muted-foreground/40">
                                    <ArrowLeftRight className="w-8 h-8 mx-auto" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Pin another molecule to compare
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Expanded comparison table */}
                {expanded && pinnedMolecules.length === 2 && pA && pB && (
                    <div className="mt-3 border border-border/60 rounded-md overflow-hidden bg-card">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/30">
                                    <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Property</th>
                                    <th className="text-right px-3 py-1.5 text-indigo-500 font-medium">A</th>
                                    <th className="text-right px-3 py-1.5 text-indigo-500 font-medium">B</th>
                                    <th className="text-right px-3 py-1.5 text-muted-foreground font-medium">Δ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {COMPARE_ROWS.map((row) => {
                                    const vA = pA[row.key];
                                    const vB = pB[row.key];
                                    if (vA == null && vB == null) return null;

                                    if (row.key === "molecularFormula") {
                                        return (
                                            <tr key={row.key} className="border-b border-border/20 hover:bg-muted/20">
                                                <td className="px-3 py-1 text-muted-foreground">{row.label}</td>
                                                <td className="px-3 py-1 text-right font-mono" dangerouslySetInnerHTML={{ __html: String(vA ?? "").replace(/(\d+)/g, '<sub>$1</sub>') }} />
                                                <td className="px-3 py-1 text-right font-mono" dangerouslySetInnerHTML={{ __html: String(vB ?? "").replace(/(\d+)/g, '<sub>$1</sub>') }} />
                                                <td className="px-3 py-1 text-right text-muted-foreground/50">—</td>
                                            </tr>
                                        );
                                    }

                                    const nA = typeof vA === "number" ? vA : 0;
                                    const nB = typeof vB === "number" ? vB : 0;
                                    const delta = nA - nB;
                                    const d = row.decimals ?? 2;
                                    const better = row.lowerIsBetter
                                        ? (delta < 0 ? "A" : delta > 0 ? "B" : null)
                                        : null;

                                    return (
                                        <tr key={row.key} className="border-b border-border/20 hover:bg-muted/20">
                                            <td className="px-3 py-1 text-muted-foreground">{row.label}</td>
                                            <td className={`px-3 py-1 text-right font-mono tabular-nums ${better === "A" ? "text-emerald-500 font-medium" : ""}`}>
                                                {nA.toFixed(d)}{row.unit ? ` ${row.unit}` : ""}
                                            </td>
                                            <td className={`px-3 py-1 text-right font-mono tabular-nums ${better === "B" ? "text-emerald-500 font-medium" : ""}`}>
                                                {nB.toFixed(d)}{row.unit ? ` ${row.unit}` : ""}
                                            </td>
                                            <td className={`px-3 py-1 text-right font-mono tabular-nums ${delta > 0 ? "text-amber-500" : delta < 0 ? "text-blue-500" : "text-muted-foreground/50"}`}>
                                                {delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(d)}`}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
