"use client";

import { KetcherEditor } from "./KetcherEditor";

interface KetcherPanelProps {
    open: boolean;
    onClose: () => void;
    initialMolecule?: string;
    onSave: (smiles: string, molfile: string) => void;
}

export function KetcherPanel({
    open,
    onClose,
    initialMolecule,
    onSave,
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
                    {/* Ketcher Editor - Full Width. No panel header: the editor has its own
                        Save/Close controls, so a title bar only ate vertical space. */}
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
