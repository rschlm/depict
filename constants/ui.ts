/**
 * UI Constants for Depict
 */

export const MOLECULE_CARD = {
    MIN_GAP: 16,
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

/** Below this card width MoleculeCard switches to compact spacing. Keep in sync with its COMPACT_BREAKPOINT. */
export const COMPACT_CARD_WIDTH = 240;

/** Vertical padding around the structure: p-4 (normal) / p-2 (compact) in MoleculeCard. */
const STRUCTURE_PAD = 32;
const STRUCTURE_PAD_COMPACT = 16;

/**
 * Footer height to budget for: SMILES row + two chip rows + one action row + padding.
 * Measured from the rendered card. The footer is intrinsic-height (flex-none), so a card
 * that needs more (extra chip or warning row) grows its footer and shrinks its structure
 * rather than clipping; one that needs less simply gets a slightly taller structure.
 */
const FOOTER_HEIGHT = 132;
const FOOTER_HEIGHT_COMPACT = 122;

/** Height of the footer rows that `hideActionButtons` / `hideProperties` remove. */
const ACTION_ROW_HEIGHT = 32;
const ACTION_ROW_HEIGHT_COMPACT = 22;
const CHIP_ROWS_HEIGHT = 52;
const CHIP_ROWS_HEIGHT_COMPACT = 42;

/** Pixels to subtract from card height when footer sections are hidden. */
export function getHiddenRowsHeight(
    cardWidth: number,
    hideActionButtons: boolean,
    hideProperties: boolean
): number {
    const compact = cardWidth < COMPACT_CARD_WIDTH;
    let h = 0;
    if (hideActionButtons) h += compact ? ACTION_ROW_HEIGHT_COMPACT : ACTION_ROW_HEIGHT;
    if (hideProperties) h += compact ? CHIP_ROWS_HEIGHT_COMPACT : CHIP_ROWS_HEIGHT;
    return h;
}

/**
 * Compute card and structure dimensions from container width and desired cards per row.
 * Uses effective columns (may be less than requested) so card width never goes below MIN_CARD_WIDTH,
 * avoiding overflow and keeping cards readable when many columns are requested.
 *
 * Card height is the sum of its parts (structure + footer), not a fixed aspect ratio of the
 * width — the footer's height is essentially fixed in px, so scaling the whole card with width
 * left dead space on wide cards and clipped the footer on narrow ones.
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

    const compact = width < COMPACT_CARD_WIDTH;
    const structurePad = compact ? STRUCTURE_PAD_COMPACT : STRUCTURE_PAD;
    const footerHeight = compact ? FOOTER_HEIGHT_COMPACT : FOOTER_HEIGHT;

    const structureWidth = Math.max(
        MIN_STRUCTURE_WIDTH,
        Math.min(Math.round(width * 0.82), width - structurePad)
    );
    const structureHeight = Math.max(
        MIN_STRUCTURE_HEIGHT,
        Math.round(structureWidth / STRUCTURE_ASPECT)
    );

    return {
        width,
        height: structurePad + structureHeight + footerHeight,
        structureWidth,
        structureHeight,
        columns,
    };
}

export const VIRTUALIZATION = {
    OVERSCAN_ROWS: 5,
};

export const CACHE = {
    SVG_MAX_SIZE: 1000,
};
