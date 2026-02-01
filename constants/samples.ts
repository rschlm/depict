/**
 * Sample SMILES for the "Load sample" demo.
 * Aspirin, caffeine, benzene, ethanol, and reactions (including atom-mapped) for variety.
 */
export const SAMPLE_SMILES = [
  "CC(=O)OC1=CC=CC=C1C(=O)O", // Aspirin
  "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", // Caffeine
  "c1ccccc1", // Benzene
  "CCO", // Ethanol
  "CC(=O)O.OCC>[H+].[Cl-].OCC>CC(=O)OCC", // Esterification
  "[CH2:1]=[CH:2][CH:3]=[CH:4][CH2:5][H:6]>>[H:6][CH2:1][CH:2]=[CH:3][CH:4]=[CH2:5]", // Atom-mapped 1,5-hexadiene→1,3-cyclohexadiene
].join("\n");
