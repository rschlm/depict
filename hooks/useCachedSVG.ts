"use client";

import { useMemo } from 'react';
import { DepictorOptions } from 'openchemlib';
import { CACHE } from '@/constants/ui';
import { ReactionArrowStyle } from '@/store/useChemStore';
import { generateSVG } from '@/lib/svgGenerator';

export { generateSVG } from '@/lib/svgGenerator';

// Simple LRU Cache implementation
class LRUCache<K, V> {
    private cache = new Map<K, V>();
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        // Remove if exists to update position
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        this.cache.set(key, value);

        // Remove oldest if over size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
    }

    clear(): void {
        this.cache.clear();
    }
}

// Global SVG cache
const svgCache = new LRUCache<string, string>(CACHE.SVG_MAX_SIZE);

export function useCachedSVG(
    smiles: string,
    width: number,
    height: number,
    displayOptions?: DepictorOptions,
    arrowStyle: ReactionArrowStyle = "forward"
): string | null {
    const cacheKey = useMemo(
        () => `${smiles}_${width}_${height}_${arrowStyle}_${JSON.stringify(displayOptions || {})}`,
        [smiles, width, height, arrowStyle, displayOptions]
    );

    return useMemo(() => {
        const cached = svgCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const svg = generateSVG(smiles, width, height, displayOptions, arrowStyle);
        if (svg) {
            svgCache.set(cacheKey, svg);
        }
        return svg;
    }, [cacheKey, smiles, width, height, displayOptions, arrowStyle]);
}

// Export cache clear function for testing/debugging
export function clearSVGCache(): void {
    svgCache.clear();
}
