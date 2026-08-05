"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// @ts-expect-error - ketcher-standalone has typing issues with package.json exports
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { Editor } from "ketcher-react";
import { Button } from "./ui/button";
import { Save, Sparkles, Wand2, X } from "lucide-react";
import { KetcherErrorBoundary } from "./KetcherErrorBoundary";
import { toast } from "sonner";
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
  layout?: () => Promise<void>;
  cleanUp?: () => Promise<void>;
  clean?: () => Promise<void>;
  generate2dCoordinates?: () => Promise<void>;
}

interface KetcherWrapperProps {
    initialMolecule?: string;
    onSave?: (smiles: string, molfile: string) => void;
    onClose?: () => void;
}

const TEMPLATE_LIBRARY: Array<{ id: string; label: string; smiles: string }> = [
    { id: "none", label: "Insert template...", smiles: "" },
    { id: "benzene", label: "Benzene", smiles: "c1ccccc1" },
    { id: "pyridine", label: "Pyridine", smiles: "n1ccccc1" },
    { id: "indole", label: "Indole", smiles: "c1ccc2[nH]ccc2c1" },
    { id: "imidazole", label: "Imidazole", smiles: "c1ncc[nH]1" },
    { id: "piperidine", label: "Piperidine", smiles: "N1CCCCC1" },
    { id: "morpholine", label: "Morpholine", smiles: "O1CCNCC1" },
];

export function KetcherWrapper({ initialMolecule, onSave, onClose }: KetcherWrapperProps) {
    const [structServiceProvider] = useState(() => new StandaloneStructServiceProvider());
    const editorRef = useRef<KetcherEditorRef | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("none");


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
            toast.error("Failed to save structure", {
                description: "Please check the drawing and try again.",
            });
        }
    };

    const handleClean2D = useCallback(async () => {
        if (!editorRef.current || !isReady) return;
        const editor = editorRef.current;
        try {
            if (typeof editor.layout === "function") await editor.layout();
            else if (typeof editor.cleanUp === "function") await editor.cleanUp();
            else if (typeof editor.clean === "function") await editor.clean();
            else if (typeof editor.generate2dCoordinates === "function") await editor.generate2dCoordinates();
            else throw new Error("No cleanup API exposed");
            toast.success("Applied 2D cleanup");
        } catch {
            toast.info("2D cleanup is unavailable in this editor build.");
        }
    }, [isReady]);

    const handleTemplateInsert = useCallback(async (templateId: string) => {
        setSelectedTemplate(templateId);
        if (!editorRef.current || !isReady || templateId === "none") return;
        const template = TEMPLATE_LIBRARY.find((t) => t.id === templateId);
        if (!template) return;
        try {
            const { Molecule } = await import("openchemlib");
            const mol = Molecule.fromSmiles(template.smiles);
            await editorRef.current.setMolecule(mol.toMolfile());
            toast.success(`${template.label} template inserted`);
        } catch {
            toast.error("Failed to insert template");
        } finally {
            setSelectedTemplate("none");
        }
    }, [isReady]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/95">
                <h2 className="text-sm font-semibold">Structure Editor</h2>
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1">
                        <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <Button
                            onClick={handleClean2D}
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs"
                            disabled={!isReady}
                        >
                            Clean 2D
                        </Button>
                    </div>
                    <div className="hidden lg:flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                        <select
                            value={selectedTemplate}
                            onChange={(e) => { void handleTemplateInsert(e.target.value); }}
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            disabled={!isReady}
                        >
                            {TEMPLATE_LIBRARY.map((template) => (
                                <option key={template.id} value={template.id}>
                                    {template.label}
                                </option>
                            ))}
                        </select>
                    </div>
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
