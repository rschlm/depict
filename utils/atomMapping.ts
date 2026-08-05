/**
 * Atom mapping utilities for reaction SMILES.
 * Atom maps (e.g. [CH2:1]) indicate which atoms correspond between reactants and products.
 * We highlight atoms with the same map number using the same color.
 */
import type { Molecule, Reaction } from "openchemlib";

/**
 * Get all molecules from a reaction (reactants, catalysts, products).
 */
export function getMoleculesFromReaction(reaction: Reaction): Molecule[] {
    const mols: Molecule[] = [];
    for (let i = 0; i < reaction.getReactants(); i++) mols.push(reaction.getReactant(i));
    for (let i = 0; i < reaction.getCatalysts(); i++) mols.push(reaction.getCatalyst(i));
    for (let i = 0; i < reaction.getProducts(); i++) mols.push(reaction.getProduct(i));
    return mols;
}

/**
 * Collect all atom map numbers present across the molecules.
 */
export function collectMapNumbers(molecules: Molecule[]): number[] {
    const set = new Set<number>();
    for (const mol of molecules) {
        const n = mol.getAllAtoms();
        for (let i = 0; i < n; i++) {
            const mapNo = mol.getAtomMapNo(i);
            if (mapNo !== 0) set.add(mapNo);
        }
    }
    return Array.from(set).sort((a, b) => a - b);
}

/**
 * Check if any molecule in the reaction has atom maps.
 */
export function hasAtomMaps(reaction: Reaction): boolean {
    const mols = getMoleculesFromReaction(reaction);
    return collectMapNumbers(mols).length > 0;
}

