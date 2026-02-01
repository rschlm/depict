"use client";

import { X, ArrowLeftRight } from "lucide-react";
import { ChemDepict } from "./ChemDepict";
import { Button } from "./ui/button";
import { useChemStore } from "@/store/useChemStore";
import { DepictorOptions } from "openchemlib";

interface CompareBarProps {
    displayOptions?: DepictorOptions;
}

export function CompareBar({ displayOptions }: CompareBarProps) {
    const { pinnedMolecules, unpinMolecule, clearPinnedMolecules, reactionArrowStyle } = useChemStore();

    if (pinnedMolecules.length === 0) {
        return null;
    }

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
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={clearPinnedMolecules}
                    >
                        <X className="w-3.5 h-3.5" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pinnedMolecules.map((molecule, index) => (
                        <div
                            key={molecule.id}
                            className="relative bg-card border border-border/60 rounded-md overflow-hidden hover:border-border transition-all"
                        >
                            {/* Remove button */}
                            <button
                                className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm border border-border/60 rounded-full p-1 hover:bg-muted/60 transition-colors"
                                onClick={() => unpinMolecule(molecule.id)}
                            >
                                <X className="w-3 h-3" />
                            </button>

                            {/* Label */}
                            <div className="absolute top-2 left-2 z-10 bg-indigo-500/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                                {index === 0 ? "Molecule A" : "Molecule B"}
                            </div>

                            <div className="flex flex-col">
                                {/* Structure */}
                                <div className="p-4 bg-muted/20 flex items-center justify-center">
                                    <ChemDepict
                                        smiles={molecule.smiles}
                                        width={200}
                                        height={140}
                                        displayOptions={displayOptions}
                                        arrowStyle={reactionArrowStyle}
                                    />
                                </div>

                                {/* Properties */}
                                <div className="px-3 py-2 border-t border-border/60 bg-card">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                                            {molecule.smiles}
                                        </span>
                                    </div>

                                    {molecule.properties && (
                                        <div className="flex items-center gap-2">
                                            {molecule.properties.mw !== null && (
                                                <div className="flex items-center gap-1 bg-muted/30 px-1.5 py-0.5 rounded">
                                                    <span className="text-[10px] text-muted-foreground font-sans">MW:</span>
                                                    <span className="text-[10px] font-mono text-foreground font-medium">
                                                        {molecule.properties.mw.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                            {molecule.properties.logP !== null && (
                                                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${molecule.properties.logP < 5 ? "bg-emerald-500/10" : "bg-muted/30"
                                                    }`}>
                                                    <span className={`text-[10px] font-sans ${molecule.properties.logP < 5 ? "text-emerald-500" : "text-muted-foreground"
                                                    }`}>LogP:</span>
                                                    <span className={`text-[10px] font-mono font-medium ${molecule.properties.logP < 5 ? "text-emerald-500" : "text-foreground"
                                                        }`}>
                                                        {molecule.properties.logP.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Placeholder for second molecule if only one is pinned */}
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
            </div>
        </div>
    );
}
