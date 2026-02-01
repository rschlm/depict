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
                const mol = Molecule.fromSmiles(smiles);
                if (!mol) continue;

                const searcher = new SSSearcher();
                searcher.setFragment(queryFragment as Molecule);
                searcher.setMolecule(mol);

                if (searcher.isFragmentInMolecule()) {
                    matches.push(id);
                }
            } catch {
                // Skip molecules that fail to parse
                continue;
            }

            // Send progress updates every batch
            if ((i + 1) % BATCH_SIZE === 0) {
                const progress = Math.round(((i + 1) / molecules.length) * 100);
                self.postMessage({
                    matches: [...matches],
                    progress,
                    done: false
                } as SubstructureSearchProgress);
            }
        }

        // Send final result
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
