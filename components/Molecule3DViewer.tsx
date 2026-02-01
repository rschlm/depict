"use client";

import { useEffect, useRef, useState } from "react";
import { Molecule, ForceFieldMMFF94, Resources, ConformerGenerator } from "openchemlib";
import { Loader2, AlertCircle, AlertTriangle } from "lucide-react";

interface Molecule3DViewerProps {
    smiles: string;
    width?: number | string;
    height?: number | string;
    className?: string;
}

export function Molecule3DViewer({
    smiles,
    width = "100%",
    height = "100%",
    className = "",
}: Molecule3DViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);

    useEffect(() => {
        const containerRef = viewerRef.current;
        let isMounted = true;

        const initViewer = async () => {
            try {
                setLoading(true);
                setError(null);

                // Dynamically import 3dmol to avoid SSR issues
                const $3Dmol = await import("3dmol");

                if (!viewerRef.current || !isMounted) return;

                // Create the molecule from SMILES
                const mol = Molecule.fromSmiles(smiles);
                if (!mol || mol.getAllAtoms() === 0) {
                    throw new Error("Invalid SMILES or empty molecule");
                }

                // Add implicit hydrogens for better 3D structure
                mol.addImplicitHydrogens();

                // Register OpenChemLib resources if not already registered
                try {
                    await Resources.registerFromUrl();
                } catch {
                    // Resources might already be registered, which is fine
                    // Silently ignore registration errors
                }

                // Generate 3D conformer using ConformerGenerator
                const conformerGenerator = new ConformerGenerator(Date.now());
                let mol3D = conformerGenerator.getOneConformerAsMolecule(mol);

                if (!mol3D) {
                    setWarning("Large molecule - showing simplified 3D structure");
                    // Fallback: use the molecule with hydrogens for basic 3D view
                    // This happens for very large or complex molecules
                    mol3D = mol;
                }

                // Optionally apply force field minimization for better geometry
                try {
                    const forceField = new ForceFieldMMFF94(mol3D, ForceFieldMMFF94.MMFF94);
                    forceField.minimise({ maxIts: 10000, gradTol: 0.001 });
                } catch {
                    // Use conformer as-is on failure
                }

                // Get the optimized molecule as MOL format
                const molfile = mol3D.toMolfile();

                // Clear previous viewer if it exists
                if (viewerRef.current) {
                    viewerRef.current.innerHTML = "";
                }

                // Initialize 3Dmol viewer
                const config = {
                    backgroundColor: "white",
                    antialias: true,
                };
                const newViewer = $3Dmol.createViewer(viewerRef.current, config);

                // Add the molecule
                newViewer.addModel(molfile, "mol");

                // Set up the visual style
                newViewer.setStyle({}, {
                    stick: {
                        radius: 0.15,
                        colorscheme: "default",
                    },
                    sphere: {
                        scale: 0.25,
                        colorscheme: "default",
                    },
                });

                // Center and zoom
                newViewer.zoomTo();
                newViewer.zoom(1.2, 0);
                newViewer.render();

                // Enable rotation with initial angle
                newViewer.rotate(30, { x: 0, y: 1, z: 0 });
                newViewer.render();

                setLoading(false);
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Failed to create 3D view");
                    setLoading(false);
                }
            }
        };

        initViewer();

        return () => {
            isMounted = false;
            // Cleanup: clear the viewer container (3Dmol doesn't have a specific cleanup method)
            if (containerRef) {
                containerRef.innerHTML = "";
            }
        };
    }, [smiles]);

    return (
        <div className={`relative overflow-hidden rounded-md border border-border/40 ${className}`} style={{ width, height }}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-md z-10">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <p className="text-xs text-muted-foreground">Generating 3D structure...</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-md z-10">
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                        <AlertCircle className="w-6 h-6 text-destructive" />
                        <p className="text-xs text-muted-foreground">{error}</p>
                    </div>
                </div>
            )}

            {warning && !loading && !error && (
                <div className="absolute top-2 left-2 right-2 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2 z-10">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
                </div>
            )}

            <div
                ref={viewerRef}
                className="w-full h-full"
                style={{ width, height }}
            />
        </div>
    );
}
