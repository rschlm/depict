import { Molecule, MoleculeProperties } from 'openchemlib';
import { isReactionSmiles } from '../lib/reactionSmiles';

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
        molecularFormula: string;
        ro5Violations: number;
    } | null;
    error?: string;
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
        const formula = mol.getMolecularFormula().formula;
        const donorCount = props.donorCount || 0;
        const acceptorCount = props.acceptorCount || 0;
        const logP = props.logP;

        let ro5 = 0;
        if (mw > 500) ro5++;
        if (logP > 5) ro5++;
        if (donorCount > 5) ro5++;
        if (acceptorCount > 10) ro5++;

        const properties = {
            mw,
            logP,
            logPString: Array.isArray(props.logPString) ? props.logPString.join('') : String(logP),
            logS: props.logS,
            logSString: Array.isArray(props.logSString) ? props.logSString.join('') : String(props.logS),
            tpsa: props.polarSurfaceArea,
            tpsaString: Array.isArray(props.polarSurfaceAreaString) ? props.polarSurfaceAreaString.join('') : String(props.polarSurfaceArea),
            rotatableBonds: props.rotatableBondCount,
            donorCount,
            acceptorCount,
            stereoCenterCount: props.stereoCenterCount || 0,
            molecularFormula: formula,
            ro5Violations: ro5,
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
