"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Molecule, ForceFieldMMFF94, Resources, ConformerGenerator } from "openchemlib";
import { Loader2, AlertCircle, AlertTriangle, RotateCw, Atom, Droplets, Tag, Eye, EyeOff, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type StylePreset = "ball-and-stick" | "stick" | "sphere" | "line" | "cartoon";
type ColorScheme = "default" | "Jmol" | "rasmol" | "greenCarbon" | "cyanCarbon" | "orangeCarbon" | "purpleCarbon" | "whiteCarbon";
type SurfaceType = "VDW" | "SAS" | "SES" | "MS";

interface ViewerSettings {
    style: StylePreset;
    colorScheme: ColorScheme;
    showHydrogens: boolean;
    showSurface: boolean;
    surfaceType: SurfaceType;
    surfaceOpacity: number;
    spin: boolean;
    showLabels: boolean;
    projection: "perspective" | "orthographic";
}

const DEFAULT_SETTINGS: ViewerSettings = {
    style: "ball-and-stick",
    colorScheme: "default",
    showHydrogens: true,
    showSurface: false,
    surfaceType: "VDW",
    surfaceOpacity: 0.7,
    spin: false,
    showLabels: false,
    projection: "perspective",
};

const STYLE_LABELS: Record<StylePreset, string> = {
    "ball-and-stick": "Ball & Stick",
    "stick": "Stick",
    "sphere": "Space-filling",
    "line": "Wireframe",
    "cartoon": "Cartoon",
};

const COLOR_LABELS: Record<ColorScheme, string> = {
    "default": "Element (CPK)",
    "Jmol": "Jmol",
    "rasmol": "RasMol",
    "greenCarbon": "Green Carbon",
    "cyanCarbon": "Cyan Carbon",
    "orangeCarbon": "Orange Carbon",
    "purpleCarbon": "Purple Carbon",
    "whiteCarbon": "White Carbon",
};

const SURFACE_LABELS: Record<SurfaceType, string> = {
    VDW: "Van der Waals",
    SAS: "Solvent Accessible",
    SES: "Solvent Excluded",
    MS: "Molecular",
};

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewerInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const threeDmolRef = useRef<any>(null);
    const molfileRef = useRef<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [warning, setWarning] = useState<string | null>(null);
    const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);
    const { resolvedTheme } = useTheme();

    const applyStyle = useCallback((viewer: ReturnType<typeof Object>, $3Dmol: ReturnType<typeof Object>, s: ViewerSettings, molfile: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const v = viewer as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lib = $3Dmol as any;

        v.removeAllModels();
        v.removeAllSurfaces();
        v.removeAllLabels();
        v.addModel(molfile, "mol");

        const cs = s.colorScheme;

        // Apply style to ALL atoms first
        switch (s.style) {
            case "ball-and-stick":
                v.setStyle({}, { stick: { radius: 0.15, colorscheme: cs }, sphere: { scale: 0.25, colorscheme: cs } });
                break;
            case "stick":
                v.setStyle({}, { stick: { radius: 0.15, colorscheme: cs } });
                break;
            case "sphere":
                v.setStyle({}, { sphere: { colorscheme: cs } });
                break;
            case "line":
                v.setStyle({}, { line: { colorscheme: cs } });
                break;
            case "cartoon":
                v.setStyle({}, { stick: { radius: 0.08, colorscheme: cs, opacity: 0.6 }, sphere: { scale: 0.15, colorscheme: cs, opacity: 0.6 } });
                break;
        }

        // Then hide hydrogens by overriding their style
        if (!s.showHydrogens) {
            v.setStyle({ elem: "H" }, { hidden: true });
        }

        if (s.showSurface) {
            const surfaceTypeMap: Record<SurfaceType, number> = {
                VDW: lib.SurfaceType?.VDW ?? 1,
                SAS: lib.SurfaceType?.SAS ?? 2,
                SES: lib.SurfaceType?.SES ?? 3,
                MS: lib.SurfaceType?.MS ?? 4,
            };
            const surfaceSel = s.showHydrogens ? {} : { elem: { $ne: "H" } };
            v.addSurface(surfaceTypeMap[s.surfaceType], {
                opacity: s.surfaceOpacity,
                colorscheme: cs,
            }, surfaceSel);
        }

        if (s.showLabels) {
            const atoms = v.getModel().selectedAtoms({});
            for (const atom of atoms) {
                if (atom.elem && atom.elem !== "H") {
                    v.addLabel(atom.elem, {
                        position: { x: atom.x, y: atom.y, z: atom.z },
                        fontSize: 10,
                        fontColor: resolvedTheme === "dark" ? "white" : "black",
                        backgroundOpacity: 0.4,
                        backgroundColor: resolvedTheme === "dark" ? "#333" : "#eee",
                        borderRadius: 4,
                        padding: 1,
                    });
                }
            }
        }

        if (s.spin) {
            v.spin("y", 1);
        } else {
            v.spin(false);
        }

        v.setProjection(s.projection);
        v.render();
    }, [resolvedTheme]);

    useEffect(() => {
        const containerRef = viewerRef.current;
        let isMounted = true;

        const initViewer = async () => {
            try {
                setLoading(true);
                setError(null);
                setWarning(null);

                const $3Dmol = await import("3dmol");
                threeDmolRef.current = $3Dmol;

                if (!viewerRef.current || !isMounted) return;

                const mol = Molecule.fromSmiles(smiles);
                if (!mol || mol.getAllAtoms() === 0) {
                    throw new Error("Invalid SMILES or empty molecule");
                }

                mol.addImplicitHydrogens();

                try {
                    await Resources.registerFromUrl();
                } catch { /* already registered */ }

                const conformerGenerator = new ConformerGenerator(Date.now());
                let mol3D = conformerGenerator.getOneConformerAsMolecule(mol);

                if (!mol3D) {
                    if (isMounted) setWarning("Large molecule - showing simplified 3D structure");
                    mol3D = mol;
                }

                try {
                    const forceField = new ForceFieldMMFF94(mol3D, ForceFieldMMFF94.MMFF94);
                    forceField.minimise({ maxIts: 10000, gradTol: 0.001 });
                } catch { /* use as-is */ }

                const molfile = mol3D.toMolfile();
                molfileRef.current = molfile;

                if (viewerRef.current) viewerRef.current.innerHTML = "";

                const newViewer = $3Dmol.createViewer(viewerRef.current, {
                    backgroundColor: resolvedTheme === "dark" ? "#1a1a1e" : "#ffffff",
                    antialias: true,
                });

                viewerInstanceRef.current = newViewer;

                applyStyle(newViewer, $3Dmol, settings, molfile);

                newViewer.zoomTo();
                newViewer.zoom(1.2, 0);
                newViewer.rotate(30, { x: 0, y: 1, z: 0 });
                newViewer.render();

                if (isMounted) setLoading(false);
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
            viewerInstanceRef.current = null;
            if (containerRef) containerRef.innerHTML = "";
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [smiles, resolvedTheme]);

    useEffect(() => {
        if (viewerInstanceRef.current && threeDmolRef.current && molfileRef.current && !loading) {
            applyStyle(viewerInstanceRef.current, threeDmolRef.current, settings, molfileRef.current);
            viewerInstanceRef.current.zoomTo();
            viewerInstanceRef.current.zoom(1.2, 0);
            viewerInstanceRef.current.render();
        }
    }, [settings, applyStyle, loading]);

    const updateSetting = <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

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

            {/* Settings toggle */}
            {!loading && !error && (
                <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                    {/* Quick toggles */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 bg-background/70 backdrop-blur-sm border border-border/30 ${settings.spin ? "text-primary" : ""}`} onClick={() => updateSetting("spin", !settings.spin)}>
                                <RotateCw className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Auto-rotate</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 bg-background/70 backdrop-blur-sm border border-border/30 ${settings.showLabels ? "text-primary" : ""}`} onClick={() => updateSetting("showLabels", !settings.showLabels)}>
                                <Tag className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Atom labels</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 bg-background/70 backdrop-blur-sm border border-border/30 ${settings.showSurface ? "text-primary" : ""}`} onClick={() => updateSetting("showSurface", !settings.showSurface)}>
                                <Droplets className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Molecular surface</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 bg-background/70 backdrop-blur-sm border border-border/30 ${settings.showHydrogens ? "text-primary" : ""}`} onClick={() => updateSetting("showHydrogens", !settings.showHydrogens)}>
                                {settings.showHydrogens ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">{settings.showHydrogens ? "Hide hydrogens" : "Show hydrogens"}</TooltipContent>
                    </Tooltip>

                    {/* Settings panel toggle */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className={`h-7 w-7 bg-background/70 backdrop-blur-sm border border-border/30 ${showSettings ? "text-primary bg-primary/10" : ""}`} onClick={() => setShowSettings(!showSettings)}>
                                <Palette className="w-3.5 h-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">Style settings</TooltipContent>
                    </Tooltip>
                </div>
            )}

            {/* Expanded settings panel */}
            {showSettings && !loading && !error && (
                <div className="absolute top-11 right-2 z-20 w-56 bg-card/95 backdrop-blur-xl border border-border/50 rounded-lg shadow-lg p-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Style */}
                    <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Atom className="w-3 h-3" /> Style
                        </label>
                        <select
                            className="w-full text-xs bg-background border border-border/40 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                            value={settings.style}
                            onChange={(e) => updateSetting("style", e.target.value as StylePreset)}
                        >
                            {Object.entries(STYLE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Color scheme */}
                    <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Palette className="w-3 h-3" /> Colors
                        </label>
                        <select
                            className="w-full text-xs bg-background border border-border/40 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                            value={settings.colorScheme}
                            onChange={(e) => updateSetting("colorScheme", e.target.value as ColorScheme)}
                        >
                            {Object.entries(COLOR_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Surface settings */}
                    {settings.showSurface && (
                        <>
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                                    <Droplets className="w-3 h-3" /> Surface Type
                                </label>
                                <select
                                    className="w-full text-xs bg-background border border-border/40 rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                                    value={settings.surfaceType}
                                    onChange={(e) => updateSetting("surfaceType", e.target.value as SurfaceType)}
                                >
                                    {Object.entries(SURFACE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                                    <span>Surface Opacity</span>
                                    <span className="tabular-nums">{(settings.surfaceOpacity * 100).toFixed(0)}%</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={settings.surfaceOpacity}
                                    onChange={(e) => updateSetting("surfaceOpacity", parseFloat(e.target.value))}
                                    className="w-full h-1 accent-primary"
                                />
                            </div>
                        </>
                    )}

                    {/* Projection */}
                    <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 block">Projection</label>
                        <div className="flex gap-0.5 bg-muted/30 rounded-md p-0.5 border border-border/30">
                            <button
                                className={`flex-1 text-xs py-1 rounded-md transition-all ${settings.projection === "perspective" ? "bg-background shadow-sm font-medium" : "hover:bg-muted/60 text-muted-foreground"}`}
                                onClick={() => updateSetting("projection", "perspective")}
                            >
                                Perspective
                            </button>
                            <button
                                className={`flex-1 text-xs py-1 rounded-md transition-all ${settings.projection === "orthographic" ? "bg-background shadow-sm font-medium" : "hover:bg-muted/60 text-muted-foreground"}`}
                                onClick={() => updateSetting("projection", "orthographic")}
                            >
                                Ortho
                            </button>
                        </div>
                    </div>

                    {/* Reset */}
                    <button
                        className="w-full text-[11px] text-muted-foreground hover:text-foreground py-1 transition-colors"
                        onClick={() => setSettings(DEFAULT_SETTINGS)}
                    >
                        Reset to defaults
                    </button>
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
