import { useState, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { getPageSize } from '../utils/pageSizeUtils';

export interface ShowMoreBindings {
    expanded: boolean;
    hasMore: boolean;
    onShowMore: () => void;
    onShowLess: () => void;
    onClear: () => void;
}

/**
 * Centralizes ShowMore pagination state: page, hasMore, append/skip refs,
 * item slicing on show-less/clear, and all three button handlers.
 *
 * @param setItems    State setter for the paginated list (pass useState setter directly).
 * @param initialSkip Pass `true` when a mount effect handles the very first fetch
 *                    so the page-change useEffect skips its own initial run.
 */
export function useShowMore<T>(
    setItems: Dispatch<SetStateAction<T[]>>,
    { initialSkip = false }: { initialSkip?: boolean } = {},
) {
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const appendRef = useRef(false);
    const skipFetchRef = useRef(initialSkip);

    const onShowMore = useCallback(() => {
        appendRef.current = true;
        setPage(p => p + 1);
    }, []);

    const onShowLess = useCallback(() => {
        const pageSize = getPageSize();
        const prevPage = Math.max(1, page - 1);
        skipFetchRef.current = true;
        setPage(prevPage);
        setItems(prev => prev.slice(0, prevPage * pageSize));
        setHasMore(true);
    }, [page, setItems]);

    const onClear = useCallback(() => {
        const pageSize = getPageSize();
        skipFetchRef.current = true;
        setPage(1);
        setItems(prev => prev.slice(0, pageSize));
        setHasMore(true);
    }, [setItems]);

    /** Call after each fetch with the processed items and fetchedHasMore from parsePagedResponse. */
    const applyFetch = useCallback((newItems: T[], fetchedHasMore: boolean) => {
        if (appendRef.current) {
            appendRef.current = false;
            setItems(prev => [...prev, ...newItems]);
        } else {
            setItems(newItems);
        }
        setHasMore(fetchedHasMore);
    }, [setItems]);

    return {
        /** Current 1-based page. */
        page,
        /** Use to reset page when filters/tabs change. */
        setPage,
        /** Signals the next fetch should append rather than replace. */
        appendRef,
        /** Tells the page-change useEffect to skip one fetch cycle. */
        skipFetchRef,
        /** Expose for custom fetch logic that needs to set hasMore directly. */
        setHasMore,
        /** Call after each fetch: handles append-or-replace + setHasMore. */
        applyFetch,
        /** Spread directly onto <ShowMore />. */
        showMoreProps: { expanded: page > 1, hasMore, onShowMore, onShowLess, onClear } as ShowMoreBindings,
    };
}
