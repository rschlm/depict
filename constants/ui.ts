/**
 * UI Constants for Depict
 */

export const MOLECULE_CARD = {
    WIDTH: 260,
    HEIGHT: 300,
    HEIGHT_COMPACT: 264, // Height without action buttons (36px less)
    MIN_GAP: 16,
    MAX_GAP: 24,
};

export const CARDS_PER_ROW = {
    MIN: 2,
    MAX: 10,
};

/** Minimum card width; MoleculeCard scales icons/badges/buttons down when narrower than COMPACT_BREAKPOINT (240px). */
export const MIN_CARD_WIDTH = 180;

/** Minimum structure size so SVG remains legible. */
const MIN_STRUCTURE_WIDTH = 80;
const MIN_STRUCTURE_HEIGHT = Math.round(MIN_STRUCTURE_WIDTH / (220 / 160));

const STRUCTURE_ASPECT = 220 / 160; // width / height

/**
 * Compute card and structure dimensions from container width and desired cards per row.
 * Uses effective columns (may be less than requested) so card width never goes below MIN_CARD_WIDTH,
 * avoiding overflow and keeping cards readable when many columns are requested.
 */
export function getCardDimensionsFromCardsPerRow(
    containerWidth: number,
    cardsPerRow: number,
    gap: number = MOLECULE_CARD.MIN_GAP
): { width: number; height: number; structureWidth: number; structureHeight: number; columns: number } {
    const requestedColumns = Math.max(1, Math.min(CARDS_PER_ROW.MAX, Math.round(cardsPerRow)));
    const maxColumnsThatFit = Math.max(1, Math.floor((containerWidth - gap) / (MIN_CARD_WIDTH + gap)));
    const columns = Math.min(requestedColumns, maxColumnsThatFit);
    const totalGap = (columns + 1) * gap;
    const width = Math.max(MIN_CARD_WIDTH, Math.floor((containerWidth - totalGap) / columns));
    const height = Math.round(width * (MOLECULE_CARD.HEIGHT / MOLECULE_CARD.WIDTH));
    const footerMinHeight = width < 240 ? 76 : 100;
    const structureAreaWidth = Math.max(MIN_STRUCTURE_WIDTH, width - 32);
    const structureAreaHeight = Math.max(MIN_STRUCTURE_HEIGHT, height - footerMinHeight - 32);
    let structureWidth = Math.round(width * 0.82);
    let structureHeight = Math.round(structureWidth / STRUCTURE_ASPECT);
    structureWidth = Math.min(structureWidth, structureAreaWidth);
    structureHeight = Math.min(structureHeight, structureAreaHeight);
    if (structureWidth < MIN_STRUCTURE_WIDTH || structureHeight < MIN_STRUCTURE_HEIGHT) {
        structureWidth = Math.max(MIN_STRUCTURE_WIDTH, structureWidth);
        structureHeight = Math.max(MIN_STRUCTURE_HEIGHT, Math.round(structureWidth / STRUCTURE_ASPECT));
        structureHeight = Math.min(structureHeight, structureAreaHeight);
    }
    return {
        width,
        height,
        structureWidth,
        structureHeight,
        columns,
    };
}

export const DEBOUNCE_MS = {
    INPUT: 800,
    RESIZE: 150,
    FILTER: 300,
};

export const WORKER_CONFIG = {
    PROPERTY_CALCULATION_WORKERS: 4,
    BATCH_SIZE: 100,
    PROGRESS_UPDATE_INTERVAL: 100,
};

export const VIRTUALIZATION = {
    OVERSCAN_ROWS: 5,
    ESTIMATED_ROW_HEIGHT: 316, // MOLECULE_CARD.HEIGHT + gap
};

export const CACHE = {
    SVG_MAX_SIZE: 1000,
    SVG_TTL_MS: 300000, // 5 minutes
};
