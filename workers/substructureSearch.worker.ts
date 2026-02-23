import { Molecule, SSSearcher, SmilesParser } from 'openchemlib';

export interface SubstructureSearchRequest {
    querySmiles: string;
    molecules: Array<{ id: string; smiles: string }>;
}

export interface SubstructureSearchProgress {
    matches: string[];
    progress: number;
    done: boolean;
}

const BATCH_SIZE = 100;

function isReactionSmiles(smiles: string): boolean {
    const s = smiles.trim();
    if (!s) return false;
    if (s.includes('>>')) return true;
    const withoutBrackets = s.replace(/\[[^\]]*\]/g, '');
    if (!withoutBrackets.includes('>')) return false;
    const parts = withoutBrackets.split('>').filter((p) => p.trim().length > 0);
    return parts.length >= 2;
}

function getReactionComponentSmiles(smiles: string): string[] {
    const components: string[] = [];
    if (smiles.includes('>>')) {
        const steps = smiles.split('>>').filter((s) => s.trim().length > 0);
        for (const step of steps) {
            if (step.includes('>')) {
                const parts = step.split('>').filter((p) => p.trim().length > 0);
                for (const part of parts) {
                    part.split('.').filter((s) => s.trim().length > 0).forEach((s) => components.push(s.trim()));
                }
            } else {
                step.split('.').filter((s) => s.trim().length > 0).forEach((s) => components.push(s.trim()));
            }
        }
    } else {
        const parts = smiles.split('>').filter((p) => p.trim().length > 0);
        for (const part of parts) {
            part.split('.').filter((s) => s.trim().length > 0).forEach((s) => components.push(s.trim()));
        }
    }
    return components;
}

/** Parse query as SMILES or SMARTS; returns a Molecule suitable for SSSearcher fragment. */
function parseQueryToFragment(query: string): Molecule {
    try {
        const mol = Molecule.fromSmiles(query);
        const fragment = mol.getCompactCopy();
        fragment.setFragment(true);
        return fragment;
    } catch {
        const parser = new SmilesParser({ smartsMode: 'guess' });
        const mol = parser.parseMolecule(query);
        const fragment = mol.getCompactCopy();
        fragment.setFragment(true);
        return fragment;
    }
}

self.onmessage = async (e: MessageEvent<SubstructureSearchRequest>) => {
    const { querySmiles, molecules } = e.data;

    try {
        const queryFragment = parseQueryToFragment(querySmiles);

        const matches: string[] = [];

        for (let i = 0; i < molecules.length; i++) {
            const { id, smiles } = molecules[i];

            try {
                if (isReactionSmiles(smiles)) {
                    const components = getReactionComponentSmiles(smiles);
                    let found = false;
                    for (const comp of components) {
                        try {
                            const mol = Molecule.fromSmiles(comp);
                            if (!mol) continue;
                            const searcher = new SSSearcher();
                            searcher.setFragment(queryFragment as Molecule);
                            searcher.setMolecule(mol);
                            if (searcher.isFragmentInMolecule()) {
                                found = true;
                                break;
                            }
                        } catch { continue; }
                    }
                    if (found) matches.push(id);
                } else {
                    const mol = Molecule.fromSmiles(smiles);
                    if (!mol) continue;

                    const searcher = new SSSearcher();
                    searcher.setFragment(queryFragment as Molecule);
                    searcher.setMolecule(mol);

                    if (searcher.isFragmentInMolecule()) {
                        matches.push(id);
                    }
                }
            } catch {
                continue;
            }

            if ((i + 1) % BATCH_SIZE === 0) {
                const progress = Math.round(((i + 1) / molecules.length) * 100);
                self.postMessage({
                    matches: [...matches],
                    progress,
                    done: false
                } as SubstructureSearchProgress);
            }
        }

        self.postMessage({
            matches,
            progress: 100,
            done: true
        } as SubstructureSearchProgress);

    } catch (error) {
        self.postMessage({
            matches: [],
            progress: 100,
            done: true,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
