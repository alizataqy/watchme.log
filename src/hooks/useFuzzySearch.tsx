import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { Show } from '@/types/show';

interface UseFuzzySearchOptions {
    threshold?: number; // 0.0 = perfect match, 1.0 = match anything (default: 0.3)
    keys?: string[]; // fields to search in
}

export function useFuzzySearch<T extends Show>(
    items: T[],
    query: string,
    options?: UseFuzzySearchOptions
) {
    const fuse = useMemo(() => {
        const fuseOptions = {
            threshold: options?.threshold ?? 0.3, // Toleransi untuk typo (0-1, semakin rendah semakin strict)
            keys: options?.keys ?? ['name', 'summary', 'genres'], // Field yang akan dicari
            ignoreLocation: true, // Cari di mana saja dalam text
            minMatchCharLength: 2, // Minimal 2 karakter untuk match
            includeScore: true, // Include score untuk debugging
        };

        return new Fuse(items, fuseOptions);
    }, [items, options?.threshold, options?.keys]);

    const results = useMemo(() => {
        if (!query || query.trim() === '') {
            return items;
        }

        const searchResults = fuse.search(query.trim());
        return searchResults.map(result => result.item);
    }, [fuse, query, items]);

    return results;
}
