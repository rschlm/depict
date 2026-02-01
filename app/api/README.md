# REST API

REST endpoints for AI agents and programmatic access.

## Endpoints

### POST /api/parse

Parse SMILES input and return validation, canonical form, and molecular properties.

**Request body:**
```json
{
  "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O\nCN1C=NC2=C1C(=O)N(C(=O)N2C)C"
}
```
- `smiles` (string | string[]): Newline or comma-separated SMILES, or array of SMILES.

**Response:**
```json
{
  "valid": ["CC(=O)OC1=CC=CC=C1C(=O)O", "CN1C=NC2=C1C(=O)N(C(=O)N2C)C"],
  "invalid": [],
  "results": [
    {
      "smiles": "CC(=O)OC1=CC=CC=C1C(=O)O",
      "valid": true,
      "canonical": "CC(=O)OC1=CC=CC=C1C(=O)O",
      "properties": { "mw": 180.16, "logP": 1.19, "tpsa": 63.6, ... },
      "isReaction": false
    }
  ]
}
```

---

### POST /api/svg

Generate SVG depiction for a molecule or reaction SMILES.

**Request body:**
```json
{
  "smiles": "CC(=O)O.OCC>[H+].[Cl-].OCC>CC(=O)OCC",
  "width": 400,
  "height": 200,
  "arrowStyle": "forward",
  "format": "json",
  "showMapping": true
}
```
- `smiles` (string, required): Molecule or reaction SMILES.
- `width` (number, optional): SVG width, default 240.
- `height` (number, optional): SVG height, default 200.
- `arrowStyle` (string, optional): `forward` | `equilibrium` | `retrosynthesis` | `no-go` | `resonance`.
- `format` (string, optional): `json` returns `{ svg: "..." }`, otherwise returns raw `image/svg+xml`.
- Display options: `showAtomNumber`, `showBondNumber`, `showMapping`, `drawBondsInGray`, etc.

**Response (format=json):**
```json
{
  "svg": "<svg ...>...</svg>"
}
```
**Response (default):** Raw SVG with `Content-Type: image/svg+xml`.

---

### POST /api/deduplicate

Remove duplicate SMILES by canonical form or exact string.

**Request body:**
```json
{
  "smiles": ["CCO", "c1ccccc1", "CCO"],
  "mode": "canonical"
}
```
- `smiles` (string[], required): Array of SMILES.
- `mode` (string, optional): `canonical` (structural identity) or `string` (exact match). Default `canonical`.

**Response:**
```json
{
  "smiles": ["CCO", "c1ccccc1"],
  "removedCount": 1,
  "totalBefore": 3,
  "totalAfter": 2
}
```
