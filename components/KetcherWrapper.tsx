"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// @ts-expect-error - ketcher-standalone has typing issues with package.json exports
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { Editor } from "ketcher-react";
import { Button } from "./ui/button";
import { Save, X } from "lucide-react";
import { KetcherErrorBoundary } from "./KetcherErrorBoundary";
import "ketcher-react/dist/index.css";

const originalError = console.error;
const originalWarn = console.warn;

if (typeof window !== 'undefined') {
    console.error = (...args: unknown[]) => {
        const message = args[0];
        const messageStr = typeof message === 'string' ? message : String(message);
        if (
            messageStr.includes('Cannot update a component') ||
            messageStr.includes('while rendering a different component') ||
            messageStr.includes('CalculateMacromoleculePropertiesButton') ||
            messageStr.includes('TopMenu') ||
            messageStr.includes('EditorContainer') ||
            messageStr.includes('SubMenu') ||
            messageStr.includes('KetcherLogger') ||
            messageStr.includes('Ketcher') ||
            messageStr.includes('needs to be initialized')
        ) {
            return;
        }
        originalError.call(console, ...args);
    };

    console.warn = (...args: unknown[]) => {
        const message = args[0];
        const messageStr = typeof message === 'string' ? message : String(message);
        if (
            messageStr.includes('KetcherLogger') ||
            messageStr.includes('Ketcher') ||
            messageStr.includes('needs to be initialized')
        ) {
            return;
        }
        originalWarn.call(console, ...args);
    };
}

if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    if (!win.Ketcher) win.Ketcher = {};
    if (!win.ketcher) win.ketcher = {};
}

interface KetcherEditorRef {
    getSmiles: () => Promise<string>;
    getMolfile: () => Promise<string>;
    setMolecule: (mol: string) => Promise<void>;
    getRxn?: () => Promise<string>;
}

interface KetcherWrapperProps {
    initialMolecule?: string;
    onSave?: (smiles: string, molfile: string) => void;
    onClose?: () => void;
}

export function KetcherWrapper({ initialMolecule, onSave, onClose }: KetcherWrapperProps) {
    const [structServiceProvider] = useState(() => new StandaloneStructServiceProvider());
    const editorRef = useRef<KetcherEditorRef | null>(null);
    const [isReady, setIsReady] = useState(false);

    const setEditorRef = useCallback((editor: KetcherEditorRef | null) => {
        if (editor) {
            editorRef.current = editor;
            if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).Ketcher = editor;
                (window as unknown as Record<string, unknown>).ketcher = editor;
            }
            setTimeout(() => setIsReady(true), 500);
        }
    }, []);

    useEffect(() => {
        if (!isReady || !editorRef.current || !initialMolecule) return;

        const loadMolecule = async () => {
            const editor = editorRef.current;
            if (!editor) return;
            try {
                const isMolfile = initialMolecule.includes("V2000") || initialMolecule.includes("V3000");
                const isRxn = initialMolecule.includes("$RXN");

                if (isMolfile || isRxn) {
                    await editor.setMolecule(initialMolecule);
                } else {
                    const { Molecule, Reaction } = await import('openchemlib');
                    const { isReactionSmiles } = await import('@/utils/chemUtils');

                    if (isReactionSmiles(initialMolecule) && !initialMolecule.includes('>>')) {
                        try {
                            const rxn = Reaction.fromSmiles(initialMolecule);
                            if (!rxn.isEmpty()) {
                                const rxnFile = rxn.toRxn();
                                await editor.setMolecule(rxnFile);
                                return;
                            }
                        } catch { /* fallback to molecule */ }
                    }

                    const mol = Molecule.fromSmiles(initialMolecule);
                    const molfile = mol.toMolfile();
                    await editor.setMolecule(molfile);
                }
            } catch {
                // Failed to load molecule
            }
        };

        loadMolecule();
    }, [initialMolecule, isReady]);

    const handleSave = async () => {
        if (!editorRef.current || !onSave || !isReady) return;

        try {
            // Try to get RXN first (if the editor has a reaction arrow)
            if (editorRef.current.getRxn) {
                try {
                    const rxnData = await editorRef.current.getRxn();
                    if (rxnData && rxnData.includes("$RXN")) {
                        const { Reaction } = await import('openchemlib');
                        const reaction = Reaction.fromRxn(rxnData);
                        if (!reaction.isEmpty()) {
                            const smiles = reaction.toSmiles();
                            onSave(smiles, rxnData);
                            return;
                        }
                    }
                } catch {
                    // Fall through to molecule save
                }
            }

            const smiles = await editorRef.current.getSmiles();
            const molfile = await editorRef.current.getMolfile();
            onSave(smiles, molfile);
        } catch {
            alert("Failed to save structure. Please check the drawing.");
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/95">
                <h2 className="text-sm font-semibold">Structure Editor</h2>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleSave}
                        size="sm"
                        className="gap-2"
                        disabled={!isReady}
                    >
                        <Save className="w-4 h-4" />
                        Save Structure
                    </Button>
                    {onClose && (
                        <Button onClick={onClose} size="sm" variant="ghost">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex-1 relative">
                <KetcherErrorBoundary>
                    <Editor
                        staticResourcesUrl=""
                        structServiceProvider={structServiceProvider}
                        onInit={setEditorRef}
                        errorHandler={() => {}}
                    />
                </KetcherErrorBoundary>
            </div>
        </div>
    );
}
