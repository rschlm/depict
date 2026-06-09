import Papa from "papaparse";
import { Molecule, Reaction, SDFileParser } from "openchemlib";

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
                    const fields = ((results.meta as { fields?: string[] } | undefined)?.fields ?? []);
                    const smilesKey = fields.find((key) => {
                        const lower = key.toLowerCase();
                        return lower.includes("smiles") || lower.includes("smile");
                    });

                    for (const row of results.data as Record<string, string>[]) {
                        const firstValue = Object.values(row)[0];
                        const smiles = smilesKey ? row[smilesKey]?.trim() : (typeof firstValue === "string" ? firstValue.trim() : "");

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
 * Parse SDF (Structure Data File) format.
 * Uses OpenChemLib's SDFileParser for record boundaries and data fields (not raw $$$$ splitting).
 */
export async function parseSDF(file: File): Promise<ParsedMoleculeData[]> {
    const text = await file.text();
    const molecules: ParsedMoleculeData[] = [];

    // Prefer OpenChemLib's SDFileParser for correct record + field handling.
    const parser = new SDFileParser(text, []);

    while (parser.next()) {
        try {
            const molfile = parser.getNextMolFile?.() as string | undefined;
            if (!molfile || molfile.trim().length === 0) continue;

            const mol = Molecule.fromMolfile(molfile);
            if (!mol || mol.getAllAtoms() === 0) continue;
            const smiles = mol.toIsomericSmiles();
            if (!smiles || smiles.trim().length === 0) continue;

            const properties: Record<string, unknown> = {};
            const raw = (parser.getNextFieldData?.() as string | undefined) ?? "";
            if (raw) {
                const lines = raw.split(/\r?\n/);
                let currentTag: string | null = null;
                let buf: string[] = [];
                const flush = () => {
                    if (!currentTag) return;
                    const v = buf.join("\n").trim();
                    if (v.length > 0) properties[currentTag] = v;
                    currentTag = null;
                    buf = [];
                };
                for (const line of lines) {
                    const l = line.trimEnd();
                    if (l.startsWith("$$$$")) break;
                    if (l.trim().startsWith(">")) {
                        flush();
                        const match = l.match(/<(.+?)>/);
                        currentTag = match?.[1] ?? null;
                        continue;
                    }
                    if (!currentTag) continue;
                    // SDF field values can be multi-line; blank line terminates field.
                    if (l.trim().length === 0) {
                        flush();
                        continue;
                    }
                    buf.push(l);
                }
                flush();
            }

            molecules.push({
                smiles,
                properties: Object.keys(properties).length > 0 ? properties : undefined,
            });
        } catch {
            // Continue with next molecule record
        }
    }

    return molecules;
}

/**
 * Parse RXN (Reaction Data File) format -- single reaction per file.
 * Contains $RXN header, counts line, then $MOL blocks for reactants and products.
 */
export async function parseRXN(file: File): Promise<ParsedMoleculeData[]> {
    const text = await file.text();
    try {
        const reaction = Reaction.fromRxn(text);
        if (reaction.isEmpty()) return [];
        const smiles = reaction.toSmiles();
        return [{ smiles }];
    } catch {
        return [];
    }
}

/**
 * Parse RDF (Reaction Data File) format -- multiple reactions per file.
 * Each reaction block starts with $RFMT / $RXN and is separated by $RFMT.
 */
export async function parseRDF(file: File): Promise<ParsedMoleculeData[]> {
    const text = await file.text();
    const molecules: ParsedMoleculeData[] = [];

    const blocks = text.split(/\$RFMT/);
    for (const block of blocks) {
        const trimmed = block.trim();
        if (!trimmed) continue;

        const rxnStart = trimmed.indexOf("$RXN");
        if (rxnStart === -1) continue;

        const rxnBlock = trimmed.substring(rxnStart);

        const properties: Record<string, unknown> = {};
        const dataPart = trimmed.substring(0, rxnStart);
        const dataLines = dataPart.split("\n");
        let currentTag = "";
        for (const line of dataLines) {
            const l = line.trim();
            if (l.startsWith("$DTYPE")) {
                currentTag = l.replace("$DTYPE", "").trim();
            } else if (l.startsWith("$DATUM") && currentTag) {
                properties[currentTag] = l.replace("$DATUM", "").trim();
                currentTag = "";
            }
        }

        try {
            const reaction = Reaction.fromRxn(rxnBlock);
            if (!reaction.isEmpty()) {
                const smiles = reaction.toSmiles();
                molecules.push({
                    smiles,
                    properties: Object.keys(properties).length > 0 ? properties : undefined,
                });
            }
        } catch {
            // Skip invalid reaction blocks
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
    } else if (extension === "rxn") {
        return parseRXN(file);
    } else if (extension === "rdf") {
        return parseRDF(file);
    } else {
        throw new Error(`Unsupported file type: ${extension}`);
    }
}
