import { create } from "zustand";
import { Molecule, SSSearcherWithIndex } from "openchemlib";
import { MoleculeProperty, isReactionSmiles, parseReactionSmiles } from "@/utils/chemUtils";
import { CARDS_PER_ROW } from "@/constants/ui";

export type ReactionArrowStyle = 
  | "forward"           // → Standard forward arrow
  | "equilibrium"       // ⇌ Equilibrium arrows
  | "retrosynthesis"    // ⇐ Backward arrow
  | "no-go"             // ⊗ Crossed out arrow
  | "resonance";        // ↔ Resonance double arrow

export interface MoleculeData {
  id: string;
  smiles: string;
  properties: MoleculeProperty | null;
  mol: Molecule | null; // Cached OCL molecule object
}

export interface PropertyFilters {
  mwMin: number | null;
  mwMax: number | null;
  logPMin: number | null;
  logPMax: number | null;
  logSMin: number | null;
  logSMax: number | null;
  tpsaMin: number | null;
  tpsaMax: number | null;
  rotatableBondsMin: number | null;
  rotatableBondsMax: number | null;
  donorCountMin: number | null;
  donorCountMax: number | null;
  acceptorCountMin: number | null;
  acceptorCountMax: number | null;
  stereoCenterCountMin: number | null;
  stereoCenterCountMax: number | null;
}

function getCurrentFilters(state: ChemStore): PropertyFilters {
  return {
    mwMin: state.mwMin,
    mwMax: state.mwMax,
    logPMin: state.logPMin,
    logPMax: state.logPMax,
    logSMin: state.logSMin,
    logSMax: state.logSMax,
    tpsaMin: state.tpsaMin,
    tpsaMax: state.tpsaMax,
    rotatableBondsMin: state.rotatableBondsMin,
    rotatableBondsMax: state.rotatableBondsMax,
    donorCountMin: state.donorCountMin,
    donorCountMax: state.donorCountMax,
    acceptorCountMin: state.acceptorCountMin,
    acceptorCountMax: state.acceptorCountMax,
    stereoCenterCountMin: state.stereoCenterCountMin,
    stereoCenterCountMax: state.stereoCenterCountMax,
  };
}

function applyPropertyFilters(
  molecules: MoleculeData[],
  filters: PropertyFilters
): MoleculeData[] {
  const { 
    mwMin, mwMax, 
    logPMin, logPMax, 
    logSMin, logSMax,
    tpsaMin, tpsaMax,
    rotatableBondsMin, rotatableBondsMax,
    donorCountMin, donorCountMax,
    acceptorCountMin, acceptorCountMax,
    stereoCenterCountMin, stereoCenterCountMax
  } = filters;
  
  const hasAny = 
    mwMin != null || mwMax != null || 
    logPMin != null || logPMax != null ||
    logSMin != null || logSMax != null ||
    tpsaMin != null || tpsaMax != null ||
    rotatableBondsMin != null || rotatableBondsMax != null ||
    donorCountMin != null || donorCountMax != null ||
    acceptorCountMin != null || acceptorCountMax != null ||
    stereoCenterCountMin != null || stereoCenterCountMax != null;
    
  if (!hasAny) return molecules;

  return molecules.filter((m) => {
    const p = m.properties;
    // If no properties, check if it's a reaction (has >> or > in SMILES)
    // Reactions should always pass through filters since they don't have properties
    if (!p) {
      return isReactionSmiles(m.smiles);
    }
    
    if (mwMin != null && p.mw < mwMin) return false;
    if (mwMax != null && p.mw > mwMax) return false;
    if (logPMin != null && p.logP < logPMin) return false;
    if (logPMax != null && p.logP > logPMax) return false;
    if (logSMin != null && p.logS < logSMin) return false;
    if (logSMax != null && p.logS > logSMax) return false;
    if (tpsaMin != null && p.tpsa < tpsaMin) return false;
    if (tpsaMax != null && p.tpsa > tpsaMax) return false;
    if (rotatableBondsMin != null && p.rotatableBonds < rotatableBondsMin) return false;
    if (rotatableBondsMax != null && p.rotatableBonds > rotatableBondsMax) return false;
    if (donorCountMin != null && p.donorCount < donorCountMin) return false;
    if (donorCountMax != null && p.donorCount > donorCountMax) return false;
    if (acceptorCountMin != null && p.acceptorCount < acceptorCountMin) return false;
    if (acceptorCountMax != null && p.acceptorCount > acceptorCountMax) return false;
    if (stereoCenterCountMin != null && p.stereoCenterCount < stereoCenterCountMin) return false;
    if (stereoCenterCountMax != null && p.stereoCenterCount > stereoCenterCountMax) return false;
    
    return true;
  });
}

interface ChemStore {
  molecules: MoleculeData[];
  /** Result of substructure filter only (or molecules when no substructure query). */
  substructureFilteredMolecules: MoleculeData[];
  /** substructureFilteredMolecules with property filters (MW/LogP) applied. */
  filteredMolecules: MoleculeData[];
  substructureQuery: string | null;
  similarityAnchor: string | null; // ID of molecule used for similarity search
  loading: boolean;
  /** Property calculation progress: { current, total } while loading, null otherwise. */
  loadingProgress: { current: number; total: number } | null;
  error: string | null;
  /** Timestamp when substructure search last failed (for toast trigger). */
  lastSubstructureErrorAt: number | null;
  pinnedMolecules: MoleculeData[]; // For side-by-side comparison (max 2)

  // Property filters
  mwMin: number | null;
  mwMax: number | null;
  logPMin: number | null;
  logPMax: number | null;
  logSMin: number | null;
  logSMax: number | null;
  tpsaMin: number | null;
  tpsaMax: number | null;
  rotatableBondsMin: number | null;
  rotatableBondsMax: number | null;
  donorCountMin: number | null;
  donorCountMax: number | null;
  acceptorCountMin: number | null;
  acceptorCountMax: number | null;
  stereoCenterCountMin: number | null;
  stereoCenterCountMax: number | null;

  // Reaction arrow style
  reactionArrowStyle: ReactionArrowStyle;
  setReactionArrowStyle: (style: ReactionArrowStyle) => void;

  // Cards per row in the grid (2–10)
  cardsPerRow: number;
  setCardsPerRow: (n: number) => void;

  // Sort (applied to filteredMolecules in UI)
  sortBy: "input" | "mw" | "logP" | "tpsa" | "logS" | "rotatableBonds" | "donorCount" | "acceptorCount" | "stereoCenterCount";
  sortOrder: "asc" | "desc";
  setSort: (sortBy: ChemStore["sortBy"], sortOrder?: "asc" | "desc") => void;

  // Actions
  setMolecules: (smiles: string[]) => void;
  /** Reorder molecules in-place without re-parsing or recalculating properties */
  reorderMolecules: (molecules: MoleculeData[]) => void;
  calculateProperties: () => Promise<void>;
  substructureSearch: (querySmiles: string) => void;
  clearSubstructureSearch: () => void;
  setPropertyFilters: (filters: Partial<PropertyFilters>) => void;
  clearPropertyFilters: () => void;
  setSimilarityAnchor: (moleculeId: string | null) => void;
  filterBySimilarity: (threshold: number) => void;
  pinMolecule: (molecule: MoleculeData) => void;
  unpinMolecule: (moleculeId: string) => void;
  clearPinnedMolecules: () => void;
}

export const useChemStore = create<ChemStore>((set, get) => ({
  molecules: [],
  substructureFilteredMolecules: [],
  filteredMolecules: [],
  substructureQuery: null,
  similarityAnchor: null,
  loading: false,
  loadingProgress: null,
  error: null,
  lastSubstructureErrorAt: null,
  pinnedMolecules: [],

  mwMin: null,
  mwMax: null,
  logPMin: null,
  logPMax: null,
  logSMin: null,
  logSMax: null,
  tpsaMin: null,
  tpsaMax: null,
  rotatableBondsMin: null,
  rotatableBondsMax: null,
  donorCountMin: null,
  donorCountMax: null,
  acceptorCountMin: null,
  acceptorCountMax: null,
  stereoCenterCountMin: null,
  stereoCenterCountMax: null,

  reactionArrowStyle: "forward",
  setReactionArrowStyle: (style: ReactionArrowStyle) => set({ reactionArrowStyle: style }),

  cardsPerRow: 4,
  setCardsPerRow: (n: number) => set({ cardsPerRow: Math.max(CARDS_PER_ROW.MIN, Math.min(CARDS_PER_ROW.MAX, Math.round(n))) }),

  sortBy: "input",
  sortOrder: "asc",
  setSort: (sortBy, sortOrder) => {
    const nextOrder = sortOrder ?? get().sortOrder;
    set({
      sortBy,
      sortOrder: nextOrder,
    });
  },

  setMolecules: (smiles: string[]) => {
    const molecules: MoleculeData[] = smiles.map((smilesStr, index) => {
      try {
        // Check if it's a reaction - reactions can't be stored as Molecule objects
        // For reactions, we store null for mol but keep the SMILES for rendering
        if (isReactionSmiles(smilesStr)) {
          // Daylight format (single >): use Reaction.fromSmiles for full validation
          // Multi-step (>>): validate each step parses as molecule
          if (smilesStr.includes('>>')) {
            const steps = smilesStr.split('>>').filter((s) => s.trim().length > 0);
            if (steps.length < 2) throw new Error('Invalid reaction');
            for (const step of steps) Molecule.fromSmiles(step);
          } else {
            const r = parseReactionSmiles(smilesStr);
            if (!r) throw new Error('Invalid reaction');
          }
          
          return {
            id: `mol-${index}`,
            smiles: smilesStr,
            properties: null,
            mol: null, // Reactions don't have a Molecule object
          };
        } else {
          const mol = Molecule.fromSmiles(smilesStr);
          return {
            id: `mol-${index}`,
            smiles: smilesStr,
            properties: null,
            mol,
          };
        }
      } catch {
        return {
          id: `mol-${index}`,
          smiles: smilesStr,
          properties: null,
          mol: null,
        };
      }
    });

    get(); // ensure we have latest state before getCurrentFilters
    const currentFilters = getCurrentFilters(get());
    set({
      molecules,
      substructureFilteredMolecules: molecules,
      filteredMolecules: applyPropertyFilters(molecules, currentFilters),
    });
  },

  reorderMolecules: (newMolecules: MoleculeData[]) => {
    const { substructureFilteredMolecules } = get();
    const substructureIds = new Set(substructureFilteredMolecules.map((m) => m.id));
    const newSubstructureFiltered = newMolecules.filter((m) => substructureIds.has(m.id));
    const currentFilters = getCurrentFilters(get());
    set({
      molecules: newMolecules,
      substructureFilteredMolecules: newSubstructureFiltered,
      filteredMolecules: applyPropertyFilters(newSubstructureFiltered, currentFilters),
    });
  },

  calculateProperties: async () => {
    set({ loading: true, error: null, loadingProgress: null });

    try {
      const { molecules } = get();

      // Skip if all molecules already have properties
      // Also filter out reactions (mol === null) as they can't have molecular properties
      const moleculesToCalculate = molecules.filter(mol => mol.properties === null && mol.mol !== null);
      if (moleculesToCalculate.length === 0) {
        set({ loading: false, loadingProgress: null });
        return;
      }

      const total = moleculesToCalculate.length;
      set({ loadingProgress: { current: 0, total } });

      // Create worker pool (4 workers for parallel processing)
      const WORKER_COUNT = 4;
      const workers: Worker[] = [];

      for (let i = 0; i < WORKER_COUNT; i++) {
        workers.push(
          new Worker(new URL('../workers/propertyCalculator.worker.ts', import.meta.url), {
            type: 'module'
          })
        );
      }

      const results = new Map<string, MoleculeProperty | null>();
      let completed = 0;

      // Create promises for all molecules
      const promises = moleculesToCalculate.map((mol, index) => {
        const worker = workers[index % WORKER_COUNT];

        return new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Timeout calculating properties for ${mol.id}`));
          }, 10000); // 10 second timeout per molecule

          const handler = (e: MessageEvent) => {
            const { id, properties, error } = e.data;

            if (id === mol.id) {
              clearTimeout(timeout);

              if (error) {
                results.set(id, null);
              } else {
                results.set(id, properties);
              }

              completed++;
              set({ loadingProgress: { current: completed, total: moleculesToCalculate.length } });

              worker.removeEventListener('message', handler);
              resolve();
            }
          };

          worker.addEventListener('message', handler);
          worker.postMessage({ smiles: mol.smiles, id: mol.id });
        });
      });

      await Promise.all(promises);

      // Terminate workers
      workers.forEach(w => w.terminate());

      // Update molecules with calculated properties
      const updatedMolecules = molecules.map(mol => {
        const calculatedProps = results.get(mol.id);
        if (calculatedProps !== undefined) {
          return { ...mol, properties: calculatedProps };
        }
        return mol;
      });

      const { substructureFilteredMolecules } = get();
      const substructureIds = new Set(substructureFilteredMolecules.map(m => m.id));
      const newSubstructureFiltered = updatedMolecules.filter(m => substructureIds.has(m.id));

      const currentFilters = getCurrentFilters(get());
      set({
        molecules: updatedMolecules,
        substructureFilteredMolecules: newSubstructureFiltered,
        filteredMolecules: applyPropertyFilters(newSubstructureFiltered, currentFilters),
        loading: false,
        loadingProgress: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unknown error",
        loading: false,
        loadingProgress: null,
      });
    }
  },

  substructureSearch: (querySmiles: string) => {
    set({ loadingProgress: null, substructureQuery: querySmiles, error: null });

    try {
      const { molecules } = get();

      const worker = new Worker(
        new URL('../workers/substructureSearch.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Prepare lightweight molecule data for worker
      const moleculeData = molecules.map(m => ({ id: m.id, smiles: m.smiles }));

      worker.onmessage = (e: MessageEvent) => {
        const { matches, done, error } = e.data;

        if (error) {
          const currentFilters = getCurrentFilters(get());
          set({
            error: `Substructure search failed: ${error}`,
            lastSubstructureErrorAt: Date.now(),
            substructureQuery: null,
            substructureFilteredMolecules: molecules,
            filteredMolecules: applyPropertyFilters(molecules, currentFilters),
          });
          worker.terminate();
          return;
        }

        // Update with current matches (progressive update)
        const base = molecules.filter(m => matches.includes(m.id));
        const currentFilters = getCurrentFilters(get());
        set({
          substructureFilteredMolecules: base,
          filteredMolecules: applyPropertyFilters(base, currentFilters),
        });

        if (done) {
          worker.terminate();
        }
      };

      worker.onerror = () => {
        const currentFilters = getCurrentFilters(get());
        set({
          error: "Substructure search failed",
          lastSubstructureErrorAt: Date.now(),
          substructureQuery: null,
          substructureFilteredMolecules: molecules,
          filteredMolecules: applyPropertyFilters(molecules, currentFilters),
        });
        worker.terminate();
      };

      worker.postMessage({ querySmiles, molecules: moleculeData });

    } catch (error) {
      const { molecules } = get();
      const currentFilters = getCurrentFilters(get());
      set({
        error: error instanceof Error ? error.message : "Substructure search failed",
        lastSubstructureErrorAt: Date.now(),
        substructureQuery: null,
        substructureFilteredMolecules: molecules,
        filteredMolecules: applyPropertyFilters(molecules, currentFilters),
      });
    }
  },

  clearSubstructureSearch: () => {
    const { molecules, error } = get();
    const currentFilters = getCurrentFilters(get());
    set({
      substructureFilteredMolecules: molecules,
      filteredMolecules: applyPropertyFilters(molecules, currentFilters),
      substructureQuery: null,
      ...(error != null && error.startsWith("Substructure search failed")
        ? { error: null, lastSubstructureErrorAt: null }
        : {}),
    });
  },

  setPropertyFilters: (filters) => {
    const state = get();
    const next: PropertyFilters = {
      mwMin: filters.mwMin !== undefined ? filters.mwMin : state.mwMin,
      mwMax: filters.mwMax !== undefined ? filters.mwMax : state.mwMax,
      logPMin: filters.logPMin !== undefined ? filters.logPMin : state.logPMin,
      logPMax: filters.logPMax !== undefined ? filters.logPMax : state.logPMax,
      logSMin: filters.logSMin !== undefined ? filters.logSMin : state.logSMin,
      logSMax: filters.logSMax !== undefined ? filters.logSMax : state.logSMax,
      tpsaMin: filters.tpsaMin !== undefined ? filters.tpsaMin : state.tpsaMin,
      tpsaMax: filters.tpsaMax !== undefined ? filters.tpsaMax : state.tpsaMax,
      rotatableBondsMin: filters.rotatableBondsMin !== undefined ? filters.rotatableBondsMin : state.rotatableBondsMin,
      rotatableBondsMax: filters.rotatableBondsMax !== undefined ? filters.rotatableBondsMax : state.rotatableBondsMax,
      donorCountMin: filters.donorCountMin !== undefined ? filters.donorCountMin : state.donorCountMin,
      donorCountMax: filters.donorCountMax !== undefined ? filters.donorCountMax : state.donorCountMax,
      acceptorCountMin: filters.acceptorCountMin !== undefined ? filters.acceptorCountMin : state.acceptorCountMin,
      acceptorCountMax: filters.acceptorCountMax !== undefined ? filters.acceptorCountMax : state.acceptorCountMax,
      stereoCenterCountMin: filters.stereoCenterCountMin !== undefined ? filters.stereoCenterCountMin : state.stereoCenterCountMin,
      stereoCenterCountMax: filters.stereoCenterCountMax !== undefined ? filters.stereoCenterCountMax : state.stereoCenterCountMax,
    };
    
    // Molecular weight and TPSA cannot be negative: clamp to 0
    if (next.mwMin != null && next.mwMin < 0) next.mwMin = 0;
    if (next.mwMax != null && next.mwMax < 0) next.mwMax = 0;
    if (next.tpsaMin != null && next.tpsaMin < 0) next.tpsaMin = 0;
    if (next.tpsaMax != null && next.tpsaMax < 0) next.tpsaMax = 0;
    
    // Count fields cannot be negative
    if (next.rotatableBondsMin != null && next.rotatableBondsMin < 0) next.rotatableBondsMin = 0;
    if (next.rotatableBondsMax != null && next.rotatableBondsMax < 0) next.rotatableBondsMax = 0;
    if (next.donorCountMin != null && next.donorCountMin < 0) next.donorCountMin = 0;
    if (next.donorCountMax != null && next.donorCountMax < 0) next.donorCountMax = 0;
    if (next.acceptorCountMin != null && next.acceptorCountMin < 0) next.acceptorCountMin = 0;
    if (next.acceptorCountMax != null && next.acceptorCountMax < 0) next.acceptorCountMax = 0;
    if (next.stereoCenterCountMin != null && next.stereoCenterCountMin < 0) next.stereoCenterCountMin = 0;
    if (next.stereoCenterCountMax != null && next.stereoCenterCountMax < 0) next.stereoCenterCountMax = 0;
    
    // Enforce min <= max for all filters
    const enforceMinMax = (minKey: keyof PropertyFilters, maxKey: keyof PropertyFilters, filterKey: keyof typeof filters) => {
      if (filters[filterKey] !== undefined && next[maxKey] != null && next[minKey] != null && (next[minKey] as number) > (next[maxKey] as number)) {
        if (filterKey === minKey) {
          next[maxKey] = next[minKey];
        } else {
          next[minKey] = next[maxKey];
        }
      }
    };
    
    enforceMinMax('mwMin', 'mwMax', filters.mwMin !== undefined ? 'mwMin' : 'mwMax');
    enforceMinMax('logPMin', 'logPMax', filters.logPMin !== undefined ? 'logPMin' : 'logPMax');
    enforceMinMax('logSMin', 'logSMax', filters.logSMin !== undefined ? 'logSMin' : 'logSMax');
    enforceMinMax('tpsaMin', 'tpsaMax', filters.tpsaMin !== undefined ? 'tpsaMin' : 'tpsaMax');
    enforceMinMax('rotatableBondsMin', 'rotatableBondsMax', filters.rotatableBondsMin !== undefined ? 'rotatableBondsMin' : 'rotatableBondsMax');
    enforceMinMax('donorCountMin', 'donorCountMax', filters.donorCountMin !== undefined ? 'donorCountMin' : 'donorCountMax');
    enforceMinMax('acceptorCountMin', 'acceptorCountMax', filters.acceptorCountMin !== undefined ? 'acceptorCountMin' : 'acceptorCountMax');
    enforceMinMax('stereoCenterCountMin', 'stereoCenterCountMax', filters.stereoCenterCountMin !== undefined ? 'stereoCenterCountMin' : 'stereoCenterCountMax');
    
    set({
      ...next,
      filteredMolecules: applyPropertyFilters(state.substructureFilteredMolecules, next),
    });
  },

  clearPropertyFilters: () => {
    const { substructureFilteredMolecules } = get();
    set({
      mwMin: null,
      mwMax: null,
      logPMin: null,
      logPMax: null,
      logSMin: null,
      logSMax: null,
      tpsaMin: null,
      tpsaMax: null,
      rotatableBondsMin: null,
      rotatableBondsMax: null,
      donorCountMin: null,
      donorCountMax: null,
      acceptorCountMin: null,
      acceptorCountMax: null,
      stereoCenterCountMin: null,
      stereoCenterCountMax: null,
      filteredMolecules: substructureFilteredMolecules,
    });
  },

  setSimilarityAnchor: (moleculeId: string | null) => {
    set({ similarityAnchor: moleculeId });
  },

  filterBySimilarity: (threshold: number = 0.7) => {
    const { molecules, similarityAnchor } = get();

    if (!similarityAnchor) {
      set({ filteredMolecules: molecules });
      return;
    }

    const anchor = molecules.find((m) => m.id === similarityAnchor);
    if (!anchor || !anchor.mol) {
      set({ filteredMolecules: molecules });
      return;
    }

    const anchorIndex = anchor.mol.getIndex();
    if (anchorIndex.length === 0) {
      set({ filteredMolecules: molecules });
      return;
    }

    const filtered = molecules
      .map((mol) => {
        if (!mol.mol) return { ...mol, similarity: 0 };

        try {
          const molIndex = mol.mol.getIndex();
          if (molIndex.length === 0) return { ...mol, similarity: 0 };

          const similarity = SSSearcherWithIndex.getSimilarityTanimoto(anchorIndex, molIndex);
          return { ...mol, similarity };
        } catch {
          return { ...mol, similarity: 0 };
        }
      })
      .filter((mol): mol is MoleculeData & { similarity: number } => (mol as MoleculeData & { similarity: number }).similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructure to omit similarity
      .map(({ similarity, ...mol }) => mol);

    set({ filteredMolecules: filtered });
  },

  pinMolecule: (molecule: MoleculeData) => {
    const { pinnedMolecules } = get();

    // Check if already pinned
    if (pinnedMolecules.some((m) => m.id === molecule.id)) {
      return;
    }

    // Max 2 pinned molecules
    if (pinnedMolecules.length >= 2) {
      // Replace the first one (FIFO)
      set({ pinnedMolecules: [pinnedMolecules[1], molecule] });
    } else {
      set({ pinnedMolecules: [...pinnedMolecules, molecule] });
    }
  },

  unpinMolecule: (moleculeId: string) => {
    const { pinnedMolecules } = get();
    set({
      pinnedMolecules: pinnedMolecules.filter((m) => m.id !== moleculeId),
    });
  },

  clearPinnedMolecules: () => {
    set({ pinnedMolecules: [] });
  },
}));

