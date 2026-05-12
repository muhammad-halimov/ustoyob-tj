import { useRef, useState, useEffect } from 'react';

interface UseDragReorderReturn {
    draggingIndex: number | null;
    dragOverIndex: number | null;
    handleDragStart: (index: number) => void;
    handleDragEnter: (index: number) => void;
    handleDragEnd: <T>(items?: T[], onReorder?: (items: T[]) => void) => void;
    handleTouchStart: (index: number, e: React.TouchEvent) => void;
    getDragProps: (index: number) => {
        draggable: boolean;
        onDragStart: () => void;
        onDragEnter: () => void;
        onDragEnd: () => void;
        onDragOver: (e: React.DragEvent) => void;
        'data-drag-index': number;
    };
}

export function useDragReorder<T>(
    items: T[],
    onReorder: (items: T[]) => void
): UseDragReorderReturn {
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);
    const touchDragOverRef = useRef<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const itemsRef = useRef(items);
    const onReorderRef = useRef(onReorder);
    useEffect(() => { itemsRef.current = items; }, [items]);
    useEffect(() => { onReorderRef.current = onReorder; }, [onReorder]);

    const handleDragStart = (index: number) => {
        dragItemRef.current = index;
        setDraggingIndex(index);
    };

    const handleDragEnter = (index: number) => {
        dragOverItemRef.current = index;
        setDragOverIndex(index);
    };

    const handleDragEnd = <U>(overrideItems?: U[], overrideReorder?: (items: U[]) => void) => {
        const from = dragItemRef.current;
        const to = dragOverItemRef.current;
        const list = (overrideItems ?? items) as T[];
        const callback = (overrideReorder ?? onReorder) as (items: T[]) => void;

        if (from !== null && to !== null && from !== to) {
            const newItems = [...list];
            const [dragged] = newItems.splice(from, 1);
            newItems.splice(to, 0, dragged);
            callback(newItems);
        }
        dragItemRef.current = null;
        dragOverItemRef.current = null;
        setDraggingIndex(null);
        setDragOverIndex(null);
    };

    const handleTouchStart = (index: number, e: React.TouchEvent) => {
        const startX = e.touches[0].clientX;
        const startY = e.touches[0].clientY;
        let dragStarted = false;

        const onMove = (ev: TouchEvent) => {
            if (!dragStarted) {
                const dx = ev.touches[0].clientX - startX;
                const dy = ev.touches[0].clientY - startY;
                if (Math.sqrt(dx * dx + dy * dy) < 8) return; // под порогом — не начинаем drag
                dragStarted = true;
                dragItemRef.current = index;
                touchDragOverRef.current = null;
                setDraggingIndex(index);
            }
            ev.preventDefault();
            const touch = ev.touches[0];
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const itemEl = el?.closest('[data-drag-index]') as HTMLElement | null;
            if (itemEl?.dataset.dragIndex !== undefined) {
                const idx = parseInt(itemEl.dataset.dragIndex, 10);
                if (!isNaN(idx) && idx !== touchDragOverRef.current) {
                    touchDragOverRef.current = idx;
                    setDragOverIndex(idx);
                }
            }
        };

        const onEnd = () => {
            if (dragStarted) {
                const from = dragItemRef.current;
                const to = touchDragOverRef.current;
                if (from !== null && to !== null && from !== to) {
                    const newItems = [...itemsRef.current];
                    const [dragged] = newItems.splice(from, 1);
                    newItems.splice(to, 0, dragged);
                    onReorderRef.current(newItems);
                }
                dragItemRef.current = null;
                touchDragOverRef.current = null;
                setDraggingIndex(null);
                setDragOverIndex(null);
            }
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
        };

        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    };

    const getDragProps = (index: number) => ({
        draggable: true,
        onDragStart: () => handleDragStart(index),
        onDragEnter: () => handleDragEnter(index),
        onDragEnd: () => handleDragEnd(),
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        'data-drag-index': index,
    });

    return {
        draggingIndex,
        dragOverIndex,
        handleDragStart,
        handleDragEnter,
        handleDragEnd,
        handleTouchStart,
        getDragProps,
    };
}
