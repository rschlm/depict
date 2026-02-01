"use client";

import { useEffect, useRef, useState, useCallback } from "react";
// @ts-expect-error - ketcher-standalone has typing issues with package.json exports
import { StandaloneStructServiceProvider } from "ketcher-standalone";
import { Editor } from "ketcher-react";
import { Button } from "./ui/button";
import { Save, X } from "lucide-react";
import { KetcherErrorBoundary } from "./KetcherErrorBoundary";
import "ketcher-react/dist/index.css";

// Suppress Ketcher's internal setState warnings at module level
const originalError = console.error;
const originalWarn = console.warn;

if (typeof window !== 'undefined') {
    console.error = (...args: unknown[]) => {
        const message = args[0];
        // Convert to string for checking
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

// detailed-fix: Mock window.Ketcher globally to prevent KetcherLogger from throwing during render
// This ensures the global object exists before ANY component renders
if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    if (!win.Ketcher) {
        win.Ketcher = {};
    }
    if (!win.ketcher) {
        win.ketcher = {};
    }
}

interface KetcherWrapperProps {
    initialMolecule?: string;
    onSave?: (smiles: string, molfile: string) => void;
    onClose?: () => void;
}

export function KetcherWrapper({ initialMolecule, onSave, onClose }: KetcherWrapperProps) {

    // Create a fresh service provider for each instance to avoid initialization issues
    // Use useState with function to ensure it's only created once per mount
    const [structServiceProvider] = useState(() => new StandaloneStructServiceProvider());


    const editorRef = useRef<{ getSmiles: () => Promise<string>; getMolfile: () => Promise<string>; setMolecule: (mol: string) => Promise<void> } | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Ref callback to capture Ketcher instance
    const setEditorRef = useCallback((editor: { getSmiles: () => Promise<string>; getMolfile: () => Promise<string>; setMolecule: (mol: string) => Promise<void> } | null) => {
        if (editor) {
            editorRef.current = editor;
            // Manual binding to ensure KetcherLogger can find the instance
            // This fixes "Ketcher needs to be initialized" errors during async operations
            if (typeof window !== 'undefined') {
                (window as unknown as Record<string, unknown>).Ketcher = editor;
                (window as unknown as Record<string, unknown>).ketcher = editor; // Bind both cases just to be safe
            }
            // Give Ketcher time to fully initialize
            setTimeout(() => setIsReady(true), 500);
        }
    }, []);

    // Load molecule when ready
    useEffect(() => {
        if (!isReady || !editorRef.current || !initialMolecule) return;

        const loadMolecule = async () => {
            const editor = editorRef.current;
            if (!editor) return;
            try {
                const isMolfile = initialMolecule.includes("V2000") || initialMolecule.includes("V3000");

                if (isMolfile) {
                    await editor.setMolecule(initialMolecule);
                } else {
                    // Convert SMILES to molfile using OpenChemLib
                    const { Molecule } = await import('openchemlib');
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
            const smiles = await editorRef.current.getSmiles();
            const molfile = await editorRef.current.getMolfile();
            onSave(smiles, molfile);
        } catch {
            alert("Failed to save molecule. Please check the structure.");
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background/95">
                <h2 className="text-sm font-semibold">Molecule Editor</h2>
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

            {/* Ketcher Editor */}
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
