import { Molecule, MoleculeProperties } from 'openchemlib';

export interface PropertyCalculationRequest {
    smiles: string;
    id: string;
}

export interface PropertyCalculationResponse {
    id: string;
    properties: {
        mw: number;
        logP: number;
        logPString: string;
        logS: number;
        logSString: string;
        tpsa: number;
        tpsaString: string;
        rotatableBonds: number;
        donorCount: number;
        acceptorCount: number;
        stereoCenterCount: number;
    } | null;
    error?: string;
}

// Keep in sync with utils/chemUtils.isReactionSmiles (workers cannot import app code)
// Daylight format: Reactants>Products or Reactants>Agents>Products; also multi-step (>>)
function isReactionSmiles(smiles: string): boolean {
    const s = smiles.trim();
    if (!s) return false;
    if (s.includes('>>')) return true;
    const withoutBrackets = s.replace(/\[[^\]]*\]/g, '');
    if (!withoutBrackets.includes('>')) return false;
    const parts = withoutBrackets.split('>').filter((p) => p.trim().length > 0);
    return parts.length >= 2;
}

self.onmessage = (e: MessageEvent<PropertyCalculationRequest>) => {
    const { smiles, id } = e.data;

    try {
        // Skip property calculation for reactions
        if (isReactionSmiles(smiles)) {
            self.postMessage({ id, properties: null } as PropertyCalculationResponse);
            return;
        }

        const mol = Molecule.fromSmiles(smiles);
        if (!mol || mol.getAllAtoms() === 0) {
            self.postMessage({ id, properties: null } as PropertyCalculationResponse);
            return;
        }

        const props = new MoleculeProperties(mol);
        const mw = mol.getMolweight();

        const properties = {
            mw,
            logP: props.logP,
            logPString: Array.isArray(props.logPString) ? props.logPString.join('') : String(props.logP),
            logS: props.logS,
            logSString: Array.isArray(props.logSString) ? props.logSString.join('') : String(props.logS),
            tpsa: props.polarSurfaceArea,
            tpsaString: Array.isArray(props.polarSurfaceAreaString) ? props.polarSurfaceAreaString.join('') : String(props.polarSurfaceArea),
            rotatableBonds: props.rotatableBondCount,
            donorCount: props.donorCount || 0,
            acceptorCount: props.acceptorCount || 0,
            stereoCenterCount: props.stereoCenterCount || 0,
        };

        self.postMessage({ id, properties } as PropertyCalculationResponse);
    } catch (error) {
        self.postMessage({
            id,
            properties: null,
            error: error instanceof Error ? error.message : String(error)
        } as PropertyCalculationResponse);
    }
};
