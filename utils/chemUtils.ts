import { Molecule, MoleculeProperties, Reaction, SSSearcher, SSSearcherWithIndex } from "openchemlib";

/**
 * Parse and validate reaction SMILES. Returns Reaction for Daylight format (single >),
 * or null if invalid. For multi-step (>>) format, returns null (use manual validation).
 * Fallback: if Reaction.fromSmiles fails, validate each part with Molecule.fromSmiles.
 */
export function parseReactionSmiles(smiles: string): Reaction | null {
  const s = smiles.trim();
  if (!s || s.includes('>>')) return null;

  try {
    const reaction = Reaction.fromSmiles(s);
    if (!reaction.isEmpty()) return reaction;
  } catch {
    /* fallback below */
  }

  // Fallback: validate each part (Reactants>Agents>Products) parses as molecule
  try {
    const parts = s.split('>').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    for (const part of parts) {
      Molecule.fromSmiles(part);
    }
    // Build minimal reaction from first and last part for downstream use
    const r = Reaction.fromSmiles(`${parts[0]}>${parts[parts.length - 1]}`);
    return r.isEmpty() ? null : r;
  } catch {
    return null;
  }
}

export interface MoleculeProperty {
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
}

export interface Ro5Detail {
  mw: boolean;
  logP: boolean;
  hbd: boolean;
  hba: boolean;
}

export function getRo5Details(p: MoleculeProperty): Ro5Detail {
  return {
    mw: p.mw <= 500,
    logP: p.logP <= 5,
    hbd: p.donorCount <= 5,
    hba: p.acceptorCount <= 10,
  };
}

export function countRo5Violations(p: MoleculeProperty): number {
  let v = 0;
  if (p.mw > 500) v++;
  if (p.logP > 5) v++;
  if (p.donorCount > 5) v++;
  if (p.acceptorCount > 10) v++;
  return v;
}

export type DeduplicationMode = "canonical" | "string";

export interface DeduplicationResult<T> {
  deduplicated: T[];
  removedCount: number;
}

/**
 * Deduplicate molecules by canonical SMILES (structural identity) or by exact string.
 * Keeps first occurrence. Reactions use raw string for canonical mode.
 */
export function deduplicateMolecules<T extends { smiles: string; mol: Molecule | null }>(
  molecules: T[],
  mode: DeduplicationMode
): DeduplicationResult<T> {
  if (molecules.length <= 1) {
    return { deduplicated: molecules, removedCount: 0 };
  }

  const seen = new Set<string>();
  const deduplicated: T[] = [];

  for (const m of molecules) {
    let key: string;
    if (mode === "string") {
      key = (m.smiles ?? "").trim();
    } else {
      if (m.mol) {
        try {
          key = m.mol.toSmiles();
        } catch {
          key = (m.smiles ?? "").trim();
        }
      } else {
        key = (m.smiles ?? "").trim();
      }
    }
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(m);
    }
  }

  return {
    deduplicated,
    removedCount: molecules.length - deduplicated.length,
  };
}

/**
 * Daylight Reaction SMILES format:
 * - Reactants>Products (2 parts) or Reactants>Agents>Products (3 parts)
 * - Each part can have multiple molecules separated by "."
 * - Agents = catalysts, solvents; do not contribute atoms to products
 *
 * Also supports multi-step (>>) convention: A>>B>>C
 *
 * Exported for use across app, store, and components; workers keep a minimal copy (see propertyCalculator.worker.ts).
 */
export function isReactionSmiles(smiles: string): boolean {
  const s = smiles.trim();
  if (!s) return false;

  // Multi-step convention: XXXX>>XXXX>>XXXX (sequential steps)
  if (s.includes('>>')) {
    return true;
  }

  // Daylight format: single > separates parts (Reactants>Products or Reactants>Agents>Products)
  // Exclude > inside brackets (e.g. [Fe+2] or stereo)
  const withoutBrackets = s.replace(/\[[^\]]*\]/g, '');
  if (!withoutBrackets.includes('>')) return false;

  const parts = withoutBrackets.split('>').filter((p) => p.trim().length > 0);
  return parts.length >= 2;
}

/**
 * Calculate molecular properties using OpenChemLib
 * Returns null for reactions (properties can't be calculated for reactions)
 */
export function calculateProperties(smiles: string): MoleculeProperty | null {
  try {
    // Skip property calculation for reactions
    if (isReactionSmiles(smiles)) {
      return null;
    }

    const mol = Molecule.fromSmiles(smiles);
    if (!mol || mol.getAllAtoms() === 0) {
      return null;
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

    return {
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
  } catch {
    return null;
  }
}

/**
 * Perform substructure search using OpenChemLib
 */
export function matchesSubstructure(
  molecule: Molecule,
  query: Molecule
): boolean {
  try {
    if (!molecule || !query) return false;

    // Clone the query molecule and set it as a fragment
    const queryFragment = query.getCompactCopy();
    queryFragment.setFragment(true);

    // Create substructure searcher
    const searcher = new SSSearcher();
    searcher.setFragment(queryFragment);
    searcher.setMolecule(molecule);

    return searcher.isFragmentInMolecule();
  } catch {
    return false;
  }
}

/**
 * Generate PubChem URL for a SMILES string
 */
export function getPubChemUrl(smiles: string): string {
  const encoded = encodeURIComponent(smiles);
  return `https://pubchem.ncbi.nlm.nih.gov/#query=${encoded}`;
}

/**
 * Generate eMolecules search URL for a SMILES string
 */
export function getEMoleculesUrl(smiles: string): string {
  const encoded = encodeURIComponent(smiles);
  return `https://orderbb.emolecules.com/search/#?smiles=${encoded}&searchtype=ex&simlimit=0.8&system-type=BB&p=0`;
}

/**
 * Generate Google Patents search URL for a SMILES string
 */
export function getGooglePatentsUrl(smiles: string): string {
  const encoded = encodeURIComponent(smiles);
  return `https://patents.google.com/?q=${encoded}`;
}

/** Atomic number to element symbol (common elements) */
const ATOMIC_NO_TO_SYMBOL: Record<number, string> = {
  1: "H", 5: "B", 6: "C", 7: "N", 8: "O", 9: "F", 14: "Si", 15: "P", 16: "S",
  17: "Cl", 35: "Br", 53: "I",
};

function getElementCounts(smiles: string): Record<number, number> {
  const counts: Record<number, number> = {};
  try {
    const mol = Molecule.fromSmiles(smiles);
    const n = mol.getAllAtoms();
    for (let i = 0; i < n; i++) {
      const z = mol.getAtomicNo(i);
      counts[z] = (counts[z] ?? 0) + 1;
    }
  } catch {
    /* skip invalid */
  }
  return counts;
}

function mergeCounts(target: Record<number, number>, src: Record<number, number>) {
  for (const [z, c] of Object.entries(src)) {
    const zNum = Number(z);
    target[zNum] = (target[zNum] ?? 0) + c;
  }
}

export interface ReactionAtomBalance {
  balanced: boolean;
  label: string;
}

export interface ReactionComponent {
  smiles: string;
  role: "reactant" | "agent" | "intermediate" | "product";
  mw: number;
  atomCount: number;
  formula: string;
}

export interface ReactionMetadata {
  numSteps: number;
  numReactants: number;
  numProducts: number;
  numAgents: number;
  components: ReactionComponent[];
  atomEconomy: number | null;
  isBalanced: boolean;
  balanceLabel: string;
  hasAtomMap: boolean;
}

/**
 * Compute atom balance for a reaction (reactants vs products).
 * Excludes agents and intermediates; compares only reactant and product sides.
 */
export function getReactionAtomBalance(
  molecules: Array<{ smiles: string; type: string }>
): ReactionAtomBalance | null {
  const reactantCounts: Record<number, number> = {};
  const productCounts: Record<number, number> = {};

  for (const m of molecules) {
    if (m.type !== "reactant" && m.type !== "product") continue;
    const counts = getElementCounts(m.smiles);
    if (m.type === "reactant") mergeCounts(reactantCounts, counts);
    else mergeCounts(productCounts, counts);
  }

  const allZ = new Set([...Object.keys(reactantCounts).map(Number), ...Object.keys(productCounts).map(Number)]);
  if (allZ.size === 0) return null;

  const imbalances: string[] = [];
  for (const z of [...allZ].sort((a, b) => a - b)) {
    const r = reactantCounts[z] ?? 0;
    const p = productCounts[z] ?? 0;
    if (r !== p) {
      const sym = ATOMIC_NO_TO_SYMBOL[z] ?? `Z${z}`;
      imbalances.push(`${sym} ${r}→${p}`);
    }
  }

  if (imbalances.length === 0) {
    return { balanced: true, label: "Balanced" };
  }
  return { balanced: false, label: `Unbalanced: ${imbalances.join(", ")}` };
}

/**
 * Compute structured metadata for a reaction SMILES string.
 * Handles both Daylight (A>B>C) and multi-step (A>>B>>C) formats.
 */
export function computeReactionMetadata(smiles: string): ReactionMetadata | null {
  if (!isReactionSmiles(smiles)) return null;

  const components: ReactionComponent[] = [];

  const addFromReaction = (
    reaction: Reaction,
    reactantRole: "reactant" | "intermediate",
    productRole: "product" | "intermediate"
  ) => {
    const add = (getMol: (i: number) => Molecule, count: number, role: ReactionComponent["role"]) => {
      for (let i = 0; i < count; i++) {
        try {
          const mol = getMol(i);
          components.push({
            smiles: mol.toSmiles(),
            role,
            mw: mol.getMolweight(),
            atomCount: mol.getAllAtoms(),
            formula: mol.getMolecularFormula().formula,
          });
        } catch { /* skip */ }
      }
    };
    add((i) => reaction.getReactant(i), reaction.getReactants(), reactantRole);
    add((i) => reaction.getCatalyst(i), reaction.getCatalysts(), "agent");
    add((i) => reaction.getProduct(i), reaction.getProducts(), productRole);
  };

  let numSteps = 1;
  let detectedAtomMap = false;

  if (smiles.includes(">>")) {
    const steps = smiles.split(">>").filter((s) => s.trim().length > 0);
    numSteps = steps.length;
    steps.forEach((step, index) => {
      const isFirst = index === 0;
      const isLast = index === steps.length - 1;
      if (step.includes(">")) {
        const reaction = parseReactionSmiles(step);
        if (reaction) {
          if (!detectedAtomMap) {
            try {
              const mols: Molecule[] = [];
              for (let i = 0; i < reaction.getReactants(); i++) mols.push(reaction.getReactant(i));
              for (let i = 0; i < reaction.getProducts(); i++) mols.push(reaction.getProduct(i));
              if (mols.some((m) => { const n = m.getAllAtoms(); for (let a = 0; a < n; a++) { if (m.getAtomMapNo(a) !== 0) return true; } return false; }))
                detectedAtomMap = true;
            } catch { /* skip */ }
          }
          addFromReaction(
            reaction,
            isFirst ? "reactant" : "intermediate",
            isLast ? "product" : "intermediate"
          );
        }
      } else {
        const fragments = step.split(".").filter((s) => s.trim().length > 0);
        const role: ReactionComponent["role"] = isFirst ? "reactant" : isLast ? "product" : "intermediate";
        for (const frag of fragments) {
          try {
            const mol = Molecule.fromSmiles(frag);
            const n = mol.getAllAtoms();
            if (!detectedAtomMap) {
              for (let a = 0; a < n; a++) { if (mol.getAtomMapNo(a) !== 0) { detectedAtomMap = true; break; } }
            }
            components.push({
              smiles: frag,
              role,
              mw: mol.getMolweight(),
              atomCount: n,
              formula: mol.getMolecularFormula().formula,
            });
          } catch { /* skip */ }
        }
      }
    });
  } else {
    // Single-step Daylight: split by > (outside brackets) then split each part by .
    const rawParts: string[] = [];
    let cur = "";
    let depth = 0;
    for (const ch of smiles) {
      if (ch === "[") depth++;
      else if (ch === "]") depth--;
      else if (ch === ">" && depth === 0) { rawParts.push(cur); cur = ""; continue; }
      cur += ch;
    }
    rawParts.push(cur);
    const nonEmpty = rawParts.map((p) => p.trim()).filter(Boolean);
    if (nonEmpty.length < 2) return null;

    const reactantPart = nonEmpty[0];
    const productPart = nonEmpty[nonEmpty.length - 1];
    const agentParts = nonEmpty.length > 2 ? nonEmpty.slice(1, -1) : [];

    const addFragments = (part: string, role: ReactionComponent["role"]) => {
      const frags = part.split(".").filter((s) => s.trim().length > 0);
      for (const frag of frags) {
        try {
          const mol = Molecule.fromSmiles(frag);
          const n = mol.getAllAtoms();
          if (!detectedAtomMap) {
            for (let a = 0; a < n; a++) { if (mol.getAtomMapNo(a) !== 0) { detectedAtomMap = true; break; } }
          }
          components.push({ smiles: frag, role, mw: mol.getMolweight(), atomCount: n, formula: mol.getMolecularFormula().formula });
        } catch { /* skip */ }
      }
    };

    addFragments(reactantPart, "reactant");
    for (const ap of agentParts) addFragments(ap, "agent");
    addFragments(productPart, "product");
  }

  if (components.length === 0) return null;

  const reactants = components.filter((c) => c.role === "reactant");
  const products = components.filter((c) => c.role === "product");
  const agents = components.filter((c) => c.role === "agent");

  const reactantMW = reactants.reduce((sum, c) => sum + c.mw, 0);
  const productMW = products.reduce((sum, c) => sum + c.mw, 0);
  const atomEconomy = reactantMW > 0 ? (productMW / reactantMW) * 100 : null;

  const balance = getReactionAtomBalance(components.map((c) => ({ smiles: c.smiles, type: c.role })));

  return {
    numSteps,
    numReactants: reactants.length,
    numProducts: products.length,
    numAgents: agents.length,
    components,
    atomEconomy: atomEconomy != null ? Math.round(atomEconomy * 10) / 10 : null,
    isBalanced: balance?.balanced ?? false,
    balanceLabel: balance?.label ?? "Unknown",
    hasAtomMap: detectedAtomMap,
  };
}

/**
 * Reaxys main page – users with subscription can paste reaction SMILES.
 * No public URL for direct reaction search by SMILES.
 */
export function getReaxysUrl(): string {
  return "https://www.reaxys.com/";
}

/**
 * SciFinder-n main page – users with subscription can paste reaction.
 * No public URL for direct reaction search.
 */
export function getSciFinderUrl(): string {
  return "https://scifinder-n.cas.org/";
}

/**
 * Calculate Tanimoto similarity between two molecules using OpenChemLib indexes
 */
export function calculateSimilarity(
  mol1: Molecule,
  mol2: Molecule
): number {
  try {
    if (!mol1 || !mol2) return 0;

    // Use IDCode for exact match
    const idcode1 = mol1.getIDCode();
    const idcode2 = mol2.getIDCode();

    if (idcode1 === idcode2 && idcode1.length > 0) return 1.0;

    // Use index-based similarity for structural similarity
    const index1 = mol1.getIndex();
    const index2 = mol2.getIndex();

    if (index1.length === 0 || index2.length === 0) return 0;

    return SSSearcherWithIndex.getSimilarityTanimoto(index1, index2);
  } catch {
    return 0;
  }
}

