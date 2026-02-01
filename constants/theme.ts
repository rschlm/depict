/**
 * Theme Constants for Depict
 * Pastel Neon color palette for dark theme molecule rendering
 */

export const ATOM_COLORS: Record<number, string> = {
    1: "#e2e8f0",  // H - light slate
    6: "#f8fafc",  // C - white/very light
    7: "#818cf8",  // N - indigo (pastel neon)
    8: "#f472b6",  // O - pink (pastel neon)
    9: "#34d399",  // F - emerald (pastel neon)
    15: "#fbbf24", // P - amber
    16: "#fcd34d", // S - yellow
    17: "#60a5fa", // Cl - blue
    35: "#34d399", // Br - emerald
    53: "#a78bfa", // I - purple
} as const;

export const Z_INDEX = {
    HEADER: 50,
    COMPARE_BAR: 50,
    DIALOG: 60,
    TOAST: 100,
} as const;
