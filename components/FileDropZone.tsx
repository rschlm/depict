"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { parseChemFile } from "@/utils/fileParser";
import { useChemStore } from "@/store/useChemStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function FileDropZone() {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
    const { setMolecules } = useChemStore();

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer?.types.includes("Files")) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.target === document || e.target === document.body) {
            setIsDragging(false);
        }
    }, []);

    const processFile = useCallback(async (file: File) => {
        try {
            setIsProcessing(true);
            setStatus("processing");
            setProgress(0);

            setProgress(15);
            const molecules = await parseChemFile(file);

            setProgress(70);

            if (molecules.length === 0) {
                setStatus("error");
                toast.error("No molecules found", {
                    description: `The file "${file.name}" doesn't contain valid SMILES strings.`,
                });
                setTimeout(() => {
                    setStatus("idle");
                    setIsProcessing(false);
                }, 2000);
                return;
            }

            const smiles = molecules.map((m) => m.smiles);
            const metadata = molecules.map((m) => {
                if (!m.properties) return {};
                const name = (m.properties["Name"] ?? m.properties["name"] ?? m.properties["IDNUMBER"] ?? m.properties["ID"]) as string | undefined;
                const customProperties: Record<string, string> = {};
                for (const [k, v] of Object.entries(m.properties)) {
                    if (v != null) customProperties[k] = String(v);
                }
                return { name: name ? String(name) : undefined, customProperties };
            });

            setProgress(90);
            setMolecules(smiles, metadata);

            setProgress(100);
            setStatus("success");

            toast.success("Import successful", {
                description: `Imported ${molecules.length.toLocaleString()} structure${molecules.length === 1 ? "" : "s"}`,
            });

            setTimeout(() => {
                setStatus("idle");
                setIsProcessing(false);
                setProgress(0);
            }, 1500);
        } catch (error) {
            setStatus("error");
            toast.error("Import failed", {
                description: error instanceof Error ? error.message : "Failed to process file",
            });
            setTimeout(() => {
                setStatus("idle");
                setIsProcessing(false);
                setProgress(0);
            }, 2000);
        }
    }, [setMolecules]);

    const handleDrop = useCallback(async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length === 0) return;

        const file = files[0];
        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!["csv", "sdf", "sd", "rxn", "rdf"].includes(extension || "")) {
            toast.error("Unsupported file type", {
                description: "Please use CSV, SDF, RXN, or RDF files",
            });
            return;
        }

        await processFile(file);
    }, [processFile]);

    useEffect(() => {
        document.addEventListener("dragover", handleDragOver);
        document.addEventListener("dragleave", handleDragLeave);
        document.addEventListener("drop", handleDrop);

        return () => {
            document.removeEventListener("dragover", handleDragOver);
            document.removeEventListener("dragleave", handleDragLeave);
            document.removeEventListener("drop", handleDrop);
        };
    }, [handleDragOver, handleDragLeave, handleDrop]);

    // Drag overlay
    if (isDragging || isProcessing) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-md">
                <div className={`
          relative w-full max-w-md mx-4 p-8 
          bg-card/95 backdrop-blur-xl
          border border-border/50
          rounded-md shadow-2xl
          transition-all duration-300 ease-out
          ${isDragging ? "scale-105 border-primary/50" : "scale-100"}
        `}>
                    {status === "processing" && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                    <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
                                </div>
                            </div>

                            <div className="text-center space-y-1">
                                <h3 className="text-base font-semibold text-foreground">
                                    Importing molecules
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Please wait while we process your file
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-muted-foreground font-sans">
                                    {progress}%
                                </p>
                            </div>
                        </div>
                    )}

                    {status === "success" && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <CheckCircle className="w-12 h-12 text-emerald-500" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-foreground">
                                    Import complete
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Your molecules have been imported successfully
                                </p>
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <AlertCircle className="w-12 h-12 text-destructive" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-foreground">
                                    Import failed
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Please check your file and try again
                                </p>
                            </div>
                        </div>
                    )}

                    {isDragging && status === "idle" && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-primary" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                                        <FileText className="w-3.5 h-3.5 text-primary-foreground" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-base font-semibold text-foreground">
                                    Drop your file here
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Supports CSV and SDF formats
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-2">
                                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground border border-border/50">
                                    .csv
                                </span>
                                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground border border-border/50">
                                    .sdf
                                </span>
                                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-muted/50 text-muted-foreground border border-border/50">
                                    .sd
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

// Export the button component for use in the header
export function FileImportButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { setMolecules } = useChemStore();
    const [isProcessing, setIsProcessing] = useState(false);
    const mdMatches = useMediaQuery("(min-width: 768px)");
    const showTooltip = !mdMatches;

    const processFile = async (file: File) => {
        try {
            setIsProcessing(true);

            const molecules = await parseChemFile(file);

            if (molecules.length === 0) {
                toast.error("No molecules found", {
                    description: `The file "${file.name}" doesn't contain valid SMILES strings.`,
                });
                return;
            }

            const smiles = molecules.map((m) => m.smiles);
            const metadata = molecules.map((m) => {
                if (!m.properties) return {};
                const name = (m.properties["Name"] ?? m.properties["name"] ?? m.properties["IDNUMBER"] ?? m.properties["ID"]) as string | undefined;
                const customProperties: Record<string, string> = {};
                for (const [k, v] of Object.entries(m.properties)) {
                    if (v != null) customProperties[k] = String(v);
                }
                return { name: name ? String(name) : undefined, customProperties };
            });
            setMolecules(smiles, metadata);

            toast.success("Import successful", {
                description: `Imported ${molecules.length.toLocaleString()} structure${molecules.length === 1 ? "" : "s"}`,
            });
        } catch (error) {
            toast.error("Import failed", {
                description: error instanceof Error ? error.message : "Failed to process file",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!["csv", "sdf", "sd", "rxn", "rdf"].includes(extension || "")) {
            toast.error("Unsupported file type", {
                description: "Please use CSV, SDF, RXN, or RDF files",
            });
            return;
        }

        await processFile(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const importButton = (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
            {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
                <Upload className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">Import</span>
        </Button>
    );

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.sdf,.sd,.rxn,.rdf"
                onChange={handleFileSelect}
                className="hidden"
            />
            {showTooltip ? (
                <Tooltip>
                    <TooltipTrigger asChild>{importButton}</TooltipTrigger>
                    <TooltipContent side="bottom">
                        <span className="text-xs">Import molecules from CSV or SDF</span>
                    </TooltipContent>
                </Tooltip>
            ) : (
                importButton
            )}
        </>
    );
}
