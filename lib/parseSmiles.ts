/**
 * Parse SMILES input (newline or comma separated) into valid and invalid lists.
 * Used by API and can be shared with client.
 */
import { Molecule } from "openchemlib";
import {
  isReactionSmiles,
  parseReactionSmiles,
  calculateProperties,
  type MoleculeProperty,
} from "@/utils/chemUtils";

export interface ParseResult {
  smiles: string;
  valid: boolean;
  canonical?: string;
  properties?: MoleculeProperty | null;
  isReaction: boolean;
}

export interface ParseSmilesOutput {
  valid: string[];
  invalid: string[];
  results: ParseResult[];
}

function parseSingleSmiles(s: string): ParseResult {
  const trimmed = s.trim();
  if (!trimmed) {
    return { smiles: s, valid: false, isReaction: false };
  }
  try {
    if (isReactionSmiles(trimmed)) {
      if (trimmed.includes(">>")) {
        const steps = trimmed.split(">>").filter((step) => step.trim().length > 0);
        if (steps.length < 2)
          return { smiles: s, valid: false, isReaction: true };
        for (const step of steps) {
          if (step.includes(">")) {
            if (!parseReactionSmiles(step))
              return { smiles: s, valid: false, isReaction: true };
          } else {
            Molecule.fromSmiles(step);
          }
        }
      } else {
        if (!parseReactionSmiles(trimmed))
          return { smiles: s, valid: false, isReaction: true };
      }
      return {
        smiles: trimmed,
        valid: true,
        canonical: trimmed,
        properties: null,
        isReaction: true,
      };
    }
    const mol = Molecule.fromSmiles(trimmed);
    const canonical = mol.toSmiles();
    const properties = calculateProperties(trimmed);
    return {
      smiles: trimmed,
      valid: true,
      canonical,
      properties,
      isReaction: false,
    };
  } catch {
    return { smiles: s, valid: false, isReaction: false };
  }
}

export function parseSmilesInput(input: string): ParseSmilesOutput {
  if (!input?.trim()) {
    return { valid: [], invalid: [], results: [] };
  }
  const lines = input.split(/\n/);
  const allSmiles: string[] = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
    allSmiles.push(...parts);
  }
  const valid: string[] = [];
  const invalid: string[] = [];
  const results: ParseResult[] = [];
  for (const s of allSmiles) {
    const result = parseSingleSmiles(s);
    results.push(result);
    if (result.valid) {
      valid.push(result.smiles);
    } else {
      invalid.push(result.smiles);
    }
  }
  return { valid, invalid, results };
}
