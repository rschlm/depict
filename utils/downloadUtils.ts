/**
 * Download utilities for exporting molecules
 */

/**
 * Download SVG content as a file
 */
export function downloadSVG(svgContent: string, filename: string) {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download text content as a file
 */
export function downloadText(content: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate a safe filename from SMILES
 */
export function generateFilenameFromSmiles(smiles: string, extension: string): string {
    const sanitized = smiles
        .substring(0, 20)
        .replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().getTime();
    return `molecule_${sanitized}_${timestamp}.${extension}`;
}

export interface MoleculeDataForExport {
    id: string;
    smiles: string;
    mol: { toMolfile: () => string } | null;
    /** Compatible with MoleculeProperty (mw, logP, etc.) */
    properties: Record<string, number> | null;
}

/** Type-safe export: MoleculeData from store is compatible. */
export function exportAllAsSDF(
    molecules: Array<{ id: string; smiles: string; mol: { toMolfile: () => string } | null }>,
    filename?: string
): void {

    const blocks: string[] = [];
    for (const m of molecules) {
        if (m.mol) {
            try {
                blocks.push(m.mol.toMolfile());
            } catch {
                // skip invalid
            }
        }
    }
    const content = blocks.join('\n$$$$\n');
    const name = filename ?? `export_${new Date().getTime()}.sdf`;
    downloadText(content, name, 'chemical/x-mdl-sdfile');
}

/** Properties subset used for CSV export (MoleculeProperty is compatible). */
export type ExportProperties = {
    mw?: number;
    logP?: number;
    logS?: number;
    tpsa?: number;
    rotatableBonds?: number;
    donorCount?: number;
    acceptorCount?: number;
    stereoCenterCount?: number;
} | null;

/** Available CSV export columns (SMILES always included). */
export const CSV_COLUMNS = [
    { key: 'SMILES', prop: null as null, label: 'SMILES' },
    { key: 'MW', prop: 'mw' as const, label: 'MW' },
    { key: 'LogP', prop: 'logP' as const, label: 'LogP' },
    { key: 'LogS', prop: 'logS' as const, label: 'LogS' },
    { key: 'TPSA', prop: 'tpsa' as const, label: 'TPSA' },
    { key: 'RotatableBonds', prop: 'rotatableBonds' as const, label: 'Rotatable bonds' },
    { key: 'DonorCount', prop: 'donorCount' as const, label: 'H-bond donors' },
    { key: 'AcceptorCount', prop: 'acceptorCount' as const, label: 'H-bond acceptors' },
    { key: 'StereoCenterCount', prop: 'stereoCenterCount' as const, label: 'Stereo centers' },
] as const;

export type CsvColumnKey = (typeof CSV_COLUMNS)[number]['key'];

/**
 * Export molecules as CSV with selected columns.
 * SMILES is always included. Columns defaults to all if not specified.
 */
export function exportAllAsCSV(
    molecules: Array<{ id: string; smiles: string; properties: ExportProperties }>,
    filename?: string,
    columns?: CsvColumnKey[]
): void {
    const selectedKeys = columns ?? CSV_COLUMNS.map((c) => c.key);
    const selectedCols = CSV_COLUMNS.filter((c) => selectedKeys.includes(c.key));
    const headers = selectedCols.map((c) => c.key);
    const rows = molecules.map((m) => {
        const p = m.properties ?? {};
        return selectedCols
            .map((c) => {
                if (c.prop === null) return m.smiles;
                const val = p[c.prop];
                return val != null ? val : '';
            })
            .join(',');
    });
    const content = [headers.join(','), ...rows].join('\n');
    const name = filename ?? `export_${new Date().getTime()}.csv`;
    downloadText(content, name, 'text/csv');
}

/**
 * Export molecules as .smi (one SMILES per line).
 */
export function exportAllAsSMI(
    molecules: Array<{ smiles: string }>,
    filename?: string
): void {
    const content = molecules.map((m) => m.smiles).join('\n');
    const name = filename ?? `export_${new Date().getTime()}.smi`;
    downloadText(content, name, 'text/plain');
}
