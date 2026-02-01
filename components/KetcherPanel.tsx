"use client";

import { KetcherEditor } from "./KetcherEditor";

interface KetcherPanelProps {
    open: boolean;
    onClose: () => void;
    initialMolecule?: string;
    onSave: (smiles: string, molfile: string) => void;
    mode?: "draw" | "edit";
}

export function KetcherPanel({
    open,
    onClose,
    initialMolecule,
    onSave,
    mode = "draw",
}: KetcherPanelProps) {
    const handleSave = (smiles: string, molfile: string) => {
        onSave(smiles, molfile);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-3xl transition-opacity duration-200 z-40 ${open ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
                style={{ backdropFilter: 'blur(40px)' }}
            />

            {/* Centered Panel */}
            <div
                className={`fixed inset-4 md:inset-8 lg:inset-12 xl:inset-16 bg-card/95 backdrop-blur-xl border border-border/50 rounded-md shadow-2xl overflow-hidden transition-all duration-300 ease-out z-50 ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="h-full flex flex-col">
                    {/* Header - Linear Style */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border/40 bg-muted/20">
                        <div className="flex items-center gap-3">
                            <h2 className="text-base sm:text-lg font-semibold tracking-tight">
                                {mode === "edit" ? "Edit Molecule" : "Draw Molecule"}
                            </h2>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                Use the molecular editor to {mode === "edit" ? "modify" : "create"} your structure
                            </span>
                        </div>
                    </div>

                    {/* Ketcher Editor - Full Width */}
                    <div className="flex-1 overflow-hidden">
                        {open && (
                            <KetcherEditor
                                initialMolecule={initialMolecule}
                                onSave={handleSave}
                                onClose={onClose}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
