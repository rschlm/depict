/**
 * Download utilities for exporting molecules and reactions
 */

import { Reaction } from "openchemlib";
import { isReactionSmiles } from "./chemUtils";

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
    isReaction: boolean;
    /** Compatible with MoleculeProperty (mw, logP, etc.) */
    properties: Record<string, number> | null;
}

/**
 * Export molecules as SDF. Returns the count of reactions that were skipped.
 */
export function exportAllAsSDF(
    molecules: Array<{ id: string; smiles: string; mol: { toMolfile: () => string } | null; isReaction: boolean }>,
    filename?: string
): number {

    const blocks: string[] = [];
    let skippedReactions = 0;
    for (const m of molecules) {
        if (m.isReaction) {
            skippedReactions++;
            continue;
        }
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
    return skippedReactions;
}

/**
 * Export reactions as RXN/RDF. Molecules are skipped.
 * Returns { exported, skippedMolecules }.
 */
export function exportAllAsRXN(
    molecules: Array<{ id: string; smiles: string; isReaction: boolean }>,
    filename?: string
): { exported: number; skippedMolecules: number } {
    const rxnBlocks: string[] = [];
    let skippedMolecules = 0;

    for (const m of molecules) {
        if (!m.isReaction) {
            skippedMolecules++;
            continue;
        }
        try {
            if (!isReactionSmiles(m.smiles)) continue;
            if (m.smiles.includes('>>')) {
                rxnBlocks.push(`$RFMT\n$RXN\n\n  Depict Export\n\n  Generated from multi-step reaction\n  Reaction SMILES: ${m.smiles}\n`);
                continue;
            }
            const rxn = Reaction.fromSmiles(m.smiles);
            if (!rxn.isEmpty()) {
                rxnBlocks.push(`$RFMT\n${rxn.toRxn()}`);
            }
        } catch {
            // skip invalid
        }
    }

    if (rxnBlocks.length > 0) {
        const content = rxnBlocks.join('\n');
        const name = filename ?? `reactions_${new Date().getTime()}.rdf`;
        downloadText(content, name, 'chemical/x-mdl-rxnfile');
    }

    return { exported: rxnBlocks.length, skippedMolecules };
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
    molecularFormula?: string;
    ro5Violations?: number;
} | null;

import type { ReactionMetadata } from "./chemUtils";

/** Available CSV export columns (SMILES always included). */
export const CSV_COLUMNS = [
    { key: 'SMILES', prop: null as null, label: 'SMILES' },
    { key: 'Name', prop: null as null, label: 'Name' },
    { key: 'Type', prop: null as null, label: 'Type' },
    { key: 'Formula', prop: 'molecularFormula' as const, label: 'Formula' },
    { key: 'MW', prop: 'mw' as const, label: 'MW' },
    { key: 'LogP', prop: 'logP' as const, label: 'LogP' },
    { key: 'LogS', prop: 'logS' as const, label: 'LogS' },
    { key: 'TPSA', prop: 'tpsa' as const, label: 'TPSA' },
    { key: 'RotatableBonds', prop: 'rotatableBonds' as const, label: 'Rotatable bonds' },
    { key: 'DonorCount', prop: 'donorCount' as const, label: 'H-bond donors' },
    { key: 'AcceptorCount', prop: 'acceptorCount' as const, label: 'H-bond acceptors' },
    { key: 'StereoCenterCount', prop: 'stereoCenterCount' as const, label: 'Stereo centers' },
    { key: 'Ro5Violations', prop: 'ro5Violations' as const, label: 'Ro5 violations' },
    { key: 'Tags', prop: null as null, label: 'Tags' },
    { key: 'StepCount', prop: null as null, label: 'Step count' },
    { key: 'AtomEconomy', prop: null as null, label: 'Atom economy (%)' },
    { key: 'IsBalanced', prop: null as null, label: 'Balanced' },
    { key: 'NumReactants', prop: null as null, label: 'Reactants' },
    { key: 'NumProducts', prop: null as null, label: 'Products' },
] as const;

export type CsvColumnKey = (typeof CSV_COLUMNS)[number]['key'];

/**
 * Export molecules as CSV with selected columns.
 * SMILES is always included. Columns defaults to all if not specified.
 */
export function exportAllAsCSV(
    molecules: Array<{ id: string; smiles: string; properties: ExportProperties; isReaction: boolean; reactionMeta?: ReactionMetadata; name?: string; tags?: string[] }>,
    filename?: string,
    columns?: CsvColumnKey[]
): void {
    const selectedKeys = columns ?? CSV_COLUMNS.map((c) => c.key);
    const selectedCols = CSV_COLUMNS.filter((c) => selectedKeys.includes(c.key));
    const headers = selectedCols.map((c) => c.key);
    const rows = molecules.map((m) => {
        const p = m.properties ?? {};
        const rm = m.reactionMeta;
        return selectedCols
            .map((c) => {
                if (c.key === 'SMILES') return `"${m.smiles.replace(/"/g, '""')}"`;
                if (c.key === 'Name') return `"${(m.name ?? '').replace(/"/g, '""')}"`;
                if (c.key === 'Type') return m.isReaction ? 'reaction' : 'molecule';
                if (c.key === 'Tags') return `"${(m.tags ?? []).join('; ').replace(/"/g, '""')}"`;
                if (c.key === 'StepCount') return rm?.numSteps ?? '';
                if (c.key === 'AtomEconomy') return rm?.atomEconomy != null ? rm.atomEconomy.toFixed(1) : '';
                if (c.key === 'IsBalanced') return rm ? (rm.isBalanced ? 'yes' : 'no') : '';
                if (c.key === 'NumReactants') return rm?.numReactants ?? '';
                if (c.key === 'NumProducts') return rm?.numProducts ?? '';
                if (c.prop === null) return '';
                const val = p[c.prop as keyof typeof p];
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
