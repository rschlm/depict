/**
 * Share link utilities: encode/decode SMILES in URL for shareable links.
 */

/** Max URL param length to avoid browser limits (~2000 chars for older browsers). */
const MAX_DATA_LENGTH = 1800;

/**
 * Encode SMILES for URL (base64, URL-safe).
 */
export function encodeSmilesForUrl(smiles: string): string {
  if (!smiles.trim()) return "";
  try {
    const base64 = btoa(unescape(encodeURIComponent(smiles)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

/**
 * Decode SMILES from URL param.
 */
export function decodeSmilesFromUrl(encoded: string): string {
  if (!encoded || typeof encoded !== "string") return "";
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return "";
  }
}

/**
 * Build a share URL with encoded SMILES.
 * Merges with existing search params.
 */
export function buildShareUrl(
  baseUrl: string,
  smiles: string,
  existingParams: URLSearchParams
): string {
  const encoded = encodeSmilesForUrl(smiles);
  if (!encoded) return "";
  const params = new URLSearchParams(existingParams);
  if (encoded.length > MAX_DATA_LENGTH) {
    return ""; // Signal that data is too long
  }
  params.set("data", encoded);
  const query = params.toString();
  return query ? `${baseUrl}?${query}` : `${baseUrl}?data=${encoded}`;
}
