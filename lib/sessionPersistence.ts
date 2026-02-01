/**
 * Session persistence for Depict.
 * Persists SMILES input, display options, cardsPerRow, hideActionButtons, hideProperties
 * to sessionStorage (survives refresh). Optionally backs up to localStorage for
 * "Restore previous session?" on next visit.
 */

import type { DepictorOptions } from "openchemlib";

const SESSION_KEY = "depict_session";
const LAST_SESSION_KEY = "depict_last_session";
const RESTORE_PROMPT_SHOWN_KEY = "depict_restore_prompt_shown";

export interface PersistedSession {
  smilesInput: string;
  displayOptions: DepictorOptions;
  cardsPerRow: number;
  hideActionButtons: boolean;
  hideProperties: boolean;
}

const DEFAULT_DISPLAY_OPTIONS: DepictorOptions = { suppressChiralText: true };

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function loadSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const data = safeParse<Partial<PersistedSession>>(raw, {});
  if (!data || typeof data.smilesInput !== "string") return null;
  return {
    smilesInput: data.smilesInput ?? "",
    displayOptions: (data.displayOptions ?? DEFAULT_DISPLAY_OPTIONS) as DepictorOptions,
    cardsPerRow: typeof data.cardsPerRow === "number" ? data.cardsPerRow : 4,
    hideActionButtons: Boolean(data.hideActionButtons),
    hideProperties: Boolean(data.hideProperties),
  };
}

export function saveSession(data: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or other storage errors
  }
}

export function loadLastSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LAST_SESSION_KEY);
  if (!raw) return null;
  const data = safeParse<Partial<PersistedSession>>(raw, {});
  if (!data || typeof data.smilesInput !== "string") return null;
  return {
    smilesInput: data.smilesInput ?? "",
    displayOptions: (data.displayOptions ?? DEFAULT_DISPLAY_OPTIONS) as DepictorOptions,
    cardsPerRow: typeof data.cardsPerRow === "number" ? data.cardsPerRow : 4,
    hideActionButtons: Boolean(data.hideActionButtons),
    hideProperties: Boolean(data.hideProperties),
  };
}

export function saveLastSession(data: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota or other storage errors
  }
}

export function hasLastSessionToRestore(): boolean {
  if (typeof window === "undefined") return false;
  const sessionHasData = sessionStorage.getItem(SESSION_KEY);
  if (sessionHasData) return false; // Current session already has data, no need to offer restore
  const last = localStorage.getItem(LAST_SESSION_KEY);
  if (!last) return false;
  const data = safeParse<{ smilesInput?: string }>(last, {});
  return Boolean(data?.smilesInput?.trim());
}

export function markRestorePromptShown(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RESTORE_PROMPT_SHOWN_KEY, "1");
}

export function shouldShowRestorePrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(RESTORE_PROMPT_SHOWN_KEY)) return false;
  return hasLastSessionToRestore();
}
