import Papa from "papaparse";
import { Molecule } from "openchemlib";

export interface ParsedMoleculeData {
    smiles: string;
    properties?: Record<string, unknown>;
}

/**
 * Parse CSV file containing SMILES strings
 * Expected format: First column is SMILES, subsequent columns are properties
 */
export async function parseCSV(file: File): Promise<ParsedMoleculeData[]> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const molecules: ParsedMoleculeData[] = [];

                    for (const row of results.data as Record<string, string>[]) {
                        // Find SMILES column (common variations)
                        const smilesKey = Object.keys(row).find((key) =>
                            key.toLowerCase().includes("smiles") ||
                            key.toLowerCase().includes("smile") ||
                            key === "SMILES" ||
                            key === "smiles"
                        );

                        const smiles = smilesKey ? row[smilesKey]?.trim() : Object.values(row)[0] as string;

                        if (smiles && typeof smiles === "string" && smiles.length > 0) {
                            // Extract other properties
                            const properties: Record<string, unknown> = {};
                            for (const [key, value] of Object.entries(row)) {
                                if (key !== smilesKey && value) {
                                    properties[key] = value;
                                }
                            }

                            molecules.push({
                                smiles,
                                properties: Object.keys(properties).length > 0 ? properties : undefined,
                            });
                        }
                    }

                    resolve(molecules);
                } catch (error) {
                    reject(error);
                }
            },
            error: (error) => {
                reject(error);
            },
        });
    });
}

/**
 * Parse SDF (Structure Data File) format
 * SDF files contain MOL blocks separated by $$$$
 */
export async function parseSDF(file: File): Promise<ParsedMoleculeData[]> {
    const text = await file.text();
    const molecules: ParsedMoleculeData[] = [];

    // Split by $$$$ delimiter
    const molBlocks = text.split(/\$\$\$\$/);

    for (const block of molBlocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        try {
            // Extract MOL block (everything before the first data tag or end)
            const lines = trimmed.split("\n");
            let molfileEnd = lines.length;

            // Find where the molfile ends (M  END line)
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim().startsWith("M  END")) {
                    molfileEnd = i + 1;
                    break;
                }
            }

            const molfile = lines.slice(0, molfileEnd).join("\n");

            // Convert MOL to SMILES using OpenChemLib
            const mol = Molecule.fromMolfile(molfile);
            const smiles = mol.toSmiles();

            // Extract data tags (properties)
            const properties: Record<string, unknown> = {};
            let currentTag = "";

            for (let i = molfileEnd; i < lines.length; i++) {
                const line = lines[i].trim();

                // Data tags start with >
                if (line.startsWith(">")) {
                    // Extract tag name between < and >
                    const match = line.match(/<(.+?)>/);
                    if (match) {
                        currentTag = match[1];
                    }
                } else if (currentTag && line) {
                    properties[currentTag] = line;
                    currentTag = "";
                }
            }

            molecules.push({
                smiles,
                properties: Object.keys(properties).length > 0 ? properties : undefined,
            });
        } catch {
            // Continue with next molecule
        }
    }

    return molecules;
}

/**
 * Detect file type and parse accordingly
 */
export async function parseChemFile(file: File): Promise<ParsedMoleculeData[]> {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
        return parseCSV(file);
    } else if (extension === "sdf" || extension === "sd") {
        return parseSDF(file);
    } else {
        throw new Error(`Unsupported file type: ${extension}`);
    }
}
