/**
 * Pure reaction-SMILES string helpers. No openchemlib dependency, so this is
 * safe to import from both app code and Web Workers.
 *
 * Daylight Reaction SMILES format:
 * - Reactants>Products (2 parts) or Reactants>Agents>Products (3 parts)
 * - Each part can have multiple molecules separated by "."
 * - Agents = catalysts, solvents; do not contribute atoms to products
 *
 * Also supports multi-step (>>) convention: A>>B>>C
 */

export function isReactionSmiles(smiles: string): boolean {
  const s = smiles.trim();
  if (!s) return false;

  // Multi-step convention: XXXX>>XXXX>>XXXX (sequential steps)
  if (s.includes(">>")) return true;

  // Daylight format: single > separates parts.
  // Exclude > inside brackets (e.g. [Fe+2] or stereo).
  const withoutBrackets = s.replace(/\[[^\]]*\]/g, "");
  if (!withoutBrackets.includes(">")) return false;

  const parts = withoutBrackets.split(">").filter((p) => p.trim().length > 0);
  return parts.length >= 2;
}

/** Flatten a reaction SMILES into its individual component SMILES (reactants, agents, products across all steps). */
export function getReactionComponentSmiles(smiles: string): string[] {
  const components: string[] = [];
  const pushFragments = (part: string) => {
    part
      .split(".")
      .filter((s) => s.trim().length > 0)
      .forEach((s) => components.push(s.trim()));
  };

  if (smiles.includes(">>")) {
    const steps = smiles.split(">>").filter((s) => s.trim().length > 0);
    for (const step of steps) {
      const parts = step.split(">").filter((p) => p.trim().length > 0);
      parts.forEach(pushFragments);
    }
  } else {
    smiles.split(">").filter((p) => p.trim().length > 0).forEach(pushFragments);
  }
  return components;
}
