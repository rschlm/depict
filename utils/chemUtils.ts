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
    numSteps = steps.length - 1;
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

export interface MoleculeWarning {
  code: "abnormalValence" | "highFormalCharge" | "stereoUnspecified";
  message: string;
  severity: "warning" | "info";
}

/**
 * Lightweight structure QA checks for fast UI badges.
 */
export function getMoleculeWarnings(mol: Molecule | null): MoleculeWarning[] {
  if (!mol) return [];

  const warnings: MoleculeWarning[] = [];
  const atomCount = mol.getAllAtoms();
  let hasAbnormalValence = false;
  let hasHighFormalCharge = false;
  let potentialStereoWithoutParity = false;

  for (let atom = 0; atom < atomCount; atom++) {
    if (!hasAbnormalValence && mol.getAtomAbnormalValence(atom) !== -1) {
      hasAbnormalValence = true;
    }
    if (!hasHighFormalCharge && Math.abs(mol.getAtomCharge(atom)) >= 2) {
      hasHighFormalCharge = true;
    }
    // Only flag stereo ambiguity for true stereo centers, not for hypervalent atoms.
    if (
      !potentialStereoWithoutParity &&
      mol.isAtomStereoCenter(atom) &&
      mol.getAtomParity(atom) === 0 &&
      mol.getAtomAbnormalValence(atom) === -1
    ) {
      potentialStereoWithoutParity = true;
    }
  }

  if (hasAbnormalValence) {
    warnings.push({
      code: "abnormalValence",
      message: "Possible abnormal valence detected.",
      severity: "warning",
    });
  }
  if (hasHighFormalCharge) {
    warnings.push({
      code: "highFormalCharge",
      message: "High formal charge detected (|charge| >= 2).",
      severity: "warning",
    });
  }
  if (potentialStereoWithoutParity && !hasAbnormalValence) {
    warnings.push({
      code: "stereoUnspecified",
      message: "Potential stereocenters may be unspecified.",
      severity: "info",
    });
  }

  return warnings;
}

interface PubChemPropertyResponse {
  PropertyTable?: {
    Properties?: Array<Record<string, string | number>>;
  };
}

// PubChem renamed its SMILES properties (IsomericSMILES/CanonicalSMILES -> SMILES/
// ConnectivitySMILES). Read whichever form the API returns, preferring full
// (stereo-bearing) SMILES over connectivity-only.
function extractSmiles(props?: Record<string, string | number>): string | null {
  if (!props) return null;
  const value =
    props.SMILES ?? props.IsomericSMILES ?? props.CanonicalSMILES ?? props.ConnectivitySMILES;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function smilesToInchi(smiles: string): Promise<{ inchi: string; inchiKey?: string } | null> {
  const encoded = encodeURIComponent(smiles);
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encoded}/property/InChI,InChIKey/JSON`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as PubChemPropertyResponse;
    const first = data.PropertyTable?.Properties?.[0];
    if (!first?.InChI) return null;
    return {
      inchi: String(first.InChI),
      inchiKey: first.InChIKey != null ? String(first.InChIKey) : undefined,
    };
  } catch {
    return null;
  }
}

export async function inchiToSmiles(inchi: string): Promise<string | null> {
  const encoded = encodeURIComponent(inchi.trim());
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchi/${encoded}/property/SMILES/JSON`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as PubChemPropertyResponse;
    return extractSmiles(data.PropertyTable?.Properties?.[0]);
  } catch {
    return null;
  }
}

// In-memory cache for chemical-name lookups (persists for the page session).
const nameToSmilesCache = new Map<string, string | null>();

/**
 * Resolve a chemical name (e.g. "aspirin", "(S)-ibuprofen") to a SMILES string
 * via the PubChem PUG-REST name endpoint. Returns null when the name is not found
 * or the request fails. Results are cached for the session.
 */
export async function nameToSmiles(name: string): Promise<string | null> {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  if (!trimmed) return null;
  if (nameToSmilesCache.has(key)) return nameToSmilesCache.get(key) ?? null;

  const encoded = encodeURIComponent(trimmed);
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/property/SMILES/JSON`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // 404 (name not found) is a definitive negative — cache it. Other errors aren't cached.
      if (response.status === 404) nameToSmilesCache.set(key, null);
      return null;
    }
    const data = (await response.json()) as PubChemPropertyResponse;
    const smiles = extractSmiles(data.PropertyTable?.Properties?.[0]);
    nameToSmilesCache.set(key, smiles);
    return smiles;
  } catch {
    return null;
  }
}

/**
 * Resolve a systematic IUPAC name (e.g. "2-acetoxybenzoic acid",
 * "bicyclo[2.2.1]heptane") to SMILES via the OPSIN web service. OPSIN is a
 * deterministic name parser — fast and ideal for systematic names, but it does
 * not understand trivial/trade names. Returns null when the name is not
 * interpretable or the request fails.
 */
export async function iupacToSmiles(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const url = `https://www.ebi.ac.uk/opsin/ws/${encodeURIComponent(trimmed)}.smi`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null; // OPSIN returns 404 with an error body for unparseable names
    const text = (await response.text()).trim();
    // A valid OPSIN SMILES response is a single whitespace-free token.
    if (!text || /\s/.test(text)) return null;
    return text;
  } catch {
    return null;
  }
}

export type NameSource = "OPSIN" | "PubChem";
export interface ResolvedName {
  smiles: string;
  source: NameSource;
}

// Combined name-resolution cache (keyed on lowercased name).
const resolveNameCache = new Map<string, ResolvedName | null>();

/**
 * Resolve a chemical name to SMILES, trying OPSIN first (systematic IUPAC names)
 * and falling back to PubChem (common and trade names). Reports which service
 * produced the result. Cached for the page session.
 */
export async function resolveChemicalName(name: string): Promise<ResolvedName | null> {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  if (!trimmed) return null;
  if (resolveNameCache.has(key)) return resolveNameCache.get(key) ?? null;

  const opsin = await iupacToSmiles(trimmed);
  if (opsin) {
    const result: ResolvedName = { smiles: opsin, source: "OPSIN" };
    resolveNameCache.set(key, result);
    return result;
  }

  const pubchem = await nameToSmiles(trimmed);
  const result: ResolvedName | null = pubchem ? { smiles: pubchem, source: "PubChem" } : null;
  resolveNameCache.set(key, result);
  return result;
}

// ----- GHS safety & hazard data (PubChem) -----

export interface HazardStatement {
  code: string; // e.g. "H302"
  text: string; // e.g. "Harmful if swallowed"
  percent?: string; // ECHA notification agreement, e.g. "95.6%"
}
export interface HazardPictogram {
  name: string; // e.g. "Irritant"
  url: string; // GHS pictogram SVG
}
export interface HazardInfo {
  cid: number;
  signal: string | null; // "Danger" | "Warning"
  pictograms: HazardPictogram[];
  hazards: HazardStatement[];
  url: string; // PubChem Safety & Hazards page
}

interface PugViewMarkup {
  URL?: string;
  Type?: string;
  Extra?: string;
}
interface PugViewInformation {
  Name?: string;
  Value?: { StringWithMarkup?: Array<{ String?: string; Markup?: PugViewMarkup[] }> };
}
interface PugViewSection {
  TOCHeading?: string;
  Information?: PugViewInformation[];
  Section?: PugViewSection[];
}

function findSection(sections: PugViewSection[], heading: string): PugViewSection | null {
  for (const s of sections) {
    if (s.TOCHeading === heading) return s;
    if (s.Section) {
      const found = findSection(s.Section, heading);
      if (found) return found;
    }
  }
  return null;
}

function firstInfo(section: PugViewSection, name: string): PugViewInformation | undefined {
  return section.Information?.find((i) => i.Name === name);
}

function parseHazardStatement(raw: string): HazardStatement | null {
  // "H302 (95.6%): Harmful if swallowed [Warning Acute toxicity, oral]"
  const m = raw.match(/^(H\d{3}[A-Za-z\d+]*)\s*(?:\(([^)]+)\))?\s*:\s*(.+?)(?:\s*\[[^\]]*\])?\s*$/);
  if (!m) return null;
  return { code: m[1], percent: m[2], text: m[3].trim() };
}

const hazardsCache = new Map<string, HazardInfo | null>();

/**
 * Fetch GHS safety & hazard classification for a molecule from PubChem: resolves
 * the SMILES to a CID, then reads the aggregated GHS Classification (signal word,
 * pictograms, hazard statements). Returns null when there is no PubChem match or
 * the request fails; returns a HazardInfo with empty `hazards` when a compound
 * exists but has no GHS classification. Cached for the page session.
 */
export async function fetchHazards(smiles: string): Promise<HazardInfo | null> {
  const key = smiles.trim();
  if (!key) return null;
  if (hazardsCache.has(key)) return hazardsCache.get(key) ?? null;

  try {
    const cidRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(key)}/cids/JSON`
    );
    if (!cidRes.ok) {
      hazardsCache.set(key, null);
      return null;
    }
    const cidData = (await cidRes.json()) as { IdentifierList?: { CID?: number[] } };
    const cid = cidData.IdentifierList?.CID?.[0];
    if (!cid) {
      hazardsCache.set(key, null);
      return null;
    }

    const safetyUrl = `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`;
    const ghsRes = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/${cid}/JSON?heading=GHS+Classification`
    );
    if (!ghsRes.ok) {
      // No GHS section for this compound (common) — resolved, but empty.
      const empty: HazardInfo = { cid, signal: null, pictograms: [], hazards: [], url: safetyUrl };
      hazardsCache.set(key, empty);
      return empty;
    }

    const ghsData = (await ghsRes.json()) as { Record?: { Section?: PugViewSection[] } };
    const section = findSection(ghsData.Record?.Section ?? [], "GHS Classification");

    let signal: string | null = null;
    const pictograms: HazardPictogram[] = [];
    const hazards: HazardStatement[] = [];

    if (section) {
      // The first group in the Information array is PubChem's aggregated ECHA summary.
      signal = firstInfo(section, "Signal")?.Value?.StringWithMarkup?.[0]?.String ?? null;

      const picInfo = firstInfo(section, "Pictogram(s)");
      const seen = new Set<string>();
      for (const swm of picInfo?.Value?.StringWithMarkup ?? []) {
        for (const mk of swm.Markup ?? []) {
          if (mk.Type === "Icon" && mk.URL && !seen.has(mk.URL)) {
            seen.add(mk.URL);
            pictograms.push({ name: mk.Extra ?? "Hazard", url: mk.URL });
          }
        }
      }

      const hazInfo = firstInfo(section, "GHS Hazard Statements");
      const seenCodes = new Set<string>();
      for (const swm of hazInfo?.Value?.StringWithMarkup ?? []) {
        const parsed = swm.String ? parseHazardStatement(swm.String) : null;
        if (parsed && !seenCodes.has(parsed.code)) {
          seenCodes.add(parsed.code);
          hazards.push(parsed);
        }
      }
    }

    const result: HazardInfo = { cid, signal, pictograms, hazards, url: safetyUrl };
    hazardsCache.set(key, result);
    return result;
  } catch {
    return null; // transient — don't cache, allow retry
  }
}

// Word/phrase shape for a common name: letters plus punctuation commonly seen in
// names (incl. a leading "(" for stereo prefixes like "(S)-ibuprofen").
const NAME_WORD_SHAPE = /^[A-Za-z(][A-Za-z0-9 '.,()\-+]*$/;

/**
 * Heuristic: does this (SMILES-invalid) token look like a chemical name — common
 * or systematic IUPAC — worth resolving to SMILES, rather than a malformed SMILES
 * string? Applied only to entries that already failed SMILES parsing, so it biases
 * toward inclusion (a false positive merely yields a cached "not found").
 */
export function looksLikeChemicalName(token: string): boolean {
  const t = token.trim();
  if (t.length < 3 || t.length > 200) return false;
  if (t.startsWith("InChI=")) return false; // handled by the InChI converter
  if (!/[a-zA-Z]/.test(t)) return false; // must contain letters
  if (/>/.test(t)) return false; // reaction SMILES separator

  // Strong systematic/IUPAC-name signals (override the SMILES-structure exclusion):
  if (/\s/.test(t)) return true; // names have spaces; SMILES never does
  if (/,/.test(t)) return true; // locant commas, e.g. "2,4-dichlorophenol"
  if (/\d-[A-Za-z]|[A-Za-z]-\d/.test(t)) return true; // locant hyphens: "hept-2-ene", "2-aminoethanol"
  if (/\[[\d.]+\]/.test(t)) return true; // ring brackets: "bicyclo[2.2.1]heptane"

  // Otherwise: a word-like common name with no SMILES bond/bracket structure.
  if (/[=#[\]]/.test(t)) return false;
  return NAME_WORD_SHAPE.test(t);
}

