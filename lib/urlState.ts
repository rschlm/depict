/**
 * URL state for filters and sort (Next.js App Router).
 * Syncs sortBy, sortOrder, substructure query, property filters, and SMILES data to the URL
 * so views are shareable and back/forward work.
 */

import { decodeSmilesFromUrl } from "./shareLink";

export type SortBy =
  | "input"
  | "mw"
  | "logP"
  | "tpsa"
  | "logS"
  | "rotatableBonds"
  | "donorCount"
  | "acceptorCount"
  | "stereoCenterCount";

export interface UrlFilterState {
  sortBy: SortBy;
  sortOrder: "asc" | "desc";
  substructureQuery: string | null;
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

const SORT_KEYS: SortBy[] = [
  "input",
  "mw",
  "logP",
  "tpsa",
  "logS",
  "rotatableBonds",
  "donorCount",
  "acceptorCount",
  "stereoCenterCount",
];

function parseNum(value: string | null): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse URL search params into filter/sort state and optional SMILES data. */
export function parseSearchParams(
  searchParams: URLSearchParams
): Partial<UrlFilterState> & {
  substructureQuery?: string | null;
  /** SMILES from share link (data param), if present. */
  smilesData?: string | null;
} {
  const sortByRaw = searchParams.get("sort");
  const sortBy: SortBy | undefined = SORT_KEYS.includes(sortByRaw as SortBy)
    ? (sortByRaw as SortBy)
    : undefined;
  const orderRaw = searchParams.get("order");
  const sortOrder: "asc" | "desc" | undefined =
    orderRaw === "asc" || orderRaw === "desc" ? orderRaw : undefined;
  const sub = searchParams.get("sub");
  const substructureQuery =
    sub != null && sub !== "" ? decodeURIComponent(sub) : null;

  const dataParam = searchParams.get("data");
  const smilesData =
    dataParam != null && dataParam !== "" ? decodeSmilesFromUrl(dataParam) : null;

  const state: Partial<UrlFilterState> & { smilesData?: string | null } = {};

  if (sortBy != null) state.sortBy = sortBy;
  if (sortOrder != null) state.sortOrder = sortOrder;
  if (substructureQuery !== null) state.substructureQuery = substructureQuery;
  if (smilesData !== null && smilesData !== "") state.smilesData = smilesData;

  const mwMin = parseNum(searchParams.get("mwMin"));
  const mwMax = parseNum(searchParams.get("mwMax"));
  if (mwMin != null || mwMax != null) {
    state.mwMin = mwMin;
    state.mwMax = mwMax;
  }
  const logPMin = parseNum(searchParams.get("logPMin"));
  const logPMax = parseNum(searchParams.get("logPMax"));
  if (logPMin != null || logPMax != null) {
    state.logPMin = logPMin;
    state.logPMax = logPMax;
  }
  const logSMin = parseNum(searchParams.get("logSMin"));
  const logSMax = parseNum(searchParams.get("logSMax"));
  if (logSMin != null || logSMax != null) {
    state.logSMin = logSMin;
    state.logSMax = logSMax;
  }
  const tpsaMin = parseNum(searchParams.get("tpsaMin"));
  const tpsaMax = parseNum(searchParams.get("tpsaMax"));
  if (tpsaMin != null || tpsaMax != null) {
    state.tpsaMin = tpsaMin;
    state.tpsaMax = tpsaMax;
  }
  const rotMin = parseNum(searchParams.get("rotMin"));
  const rotMax = parseNum(searchParams.get("rotMax"));
  if (rotMin != null || rotMax != null) {
    state.rotatableBondsMin = rotMin;
    state.rotatableBondsMax = rotMax;
  }
  const donorMin = parseNum(searchParams.get("donorMin"));
  const donorMax = parseNum(searchParams.get("donorMax"));
  if (donorMin != null || donorMax != null) {
    state.donorCountMin = donorMin;
    state.donorCountMax = donorMax;
  }
  const acceptMin = parseNum(searchParams.get("acceptMin"));
  const acceptMax = parseNum(searchParams.get("acceptMax"));
  if (acceptMin != null || acceptMax != null) {
    state.acceptorCountMin = acceptMin;
    state.acceptorCountMax = acceptMax;
  }
  const stereoMin = parseNum(searchParams.get("stereoMin"));
  const stereoMax = parseNum(searchParams.get("stereoMax"));
  if (stereoMin != null || stereoMax != null) {
    state.stereoCenterCountMin = stereoMin;
    state.stereoCenterCountMax = stereoMax;
  }

  return state;
}

/** Build URL search params from store state (only non-default values). */
export function buildSearchParams(state: UrlFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.sortBy !== "input" || state.sortOrder !== "asc") {
    params.set("sort", state.sortBy);
    params.set("order", state.sortOrder);
  }
  if (state.substructureQuery != null && state.substructureQuery !== "") {
    params.set("sub", encodeURIComponent(state.substructureQuery));
  }

  if (state.mwMin != null) params.set("mwMin", String(state.mwMin));
  if (state.mwMax != null) params.set("mwMax", String(state.mwMax));
  if (state.logPMin != null) params.set("logPMin", String(state.logPMin));
  if (state.logPMax != null) params.set("logPMax", String(state.logPMax));
  if (state.logSMin != null) params.set("logSMin", String(state.logSMin));
  if (state.logSMax != null) params.set("logSMax", String(state.logSMax));
  if (state.tpsaMin != null) params.set("tpsaMin", String(state.tpsaMin));
  if (state.tpsaMax != null) params.set("tpsaMax", String(state.tpsaMax));
  if (state.rotatableBondsMin != null)
    params.set("rotMin", String(state.rotatableBondsMin));
  if (state.rotatableBondsMax != null)
    params.set("rotMax", String(state.rotatableBondsMax));
  if (state.donorCountMin != null)
    params.set("donorMin", String(state.donorCountMin));
  if (state.donorCountMax != null)
    params.set("donorMax", String(state.donorCountMax));
  if (state.acceptorCountMin != null)
    params.set("acceptMin", String(state.acceptorCountMin));
  if (state.acceptorCountMax != null)
    params.set("acceptMax", String(state.acceptorCountMax));
  if (state.stereoCenterCountMin != null)
    params.set("stereoMin", String(state.stereoCenterCountMin));
  if (state.stereoCenterCountMax != null)
    params.set("stereoMax", String(state.stereoCenterCountMax));

  return params;
}
