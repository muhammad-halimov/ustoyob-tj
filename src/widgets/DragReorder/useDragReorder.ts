import { useRef, useState } from 'react';

interface UseDragReorderReturn {
    draggingIndex: number | null;
    dragOverIndex: number | null;
    handleDragStart: (index: number) => void;
    handleDragEnter: (index: number) => void;
    handleDragEnd: <T>(items?: T[], onReorder?: (items: T[]) => void) => void;
    getDragProps: (index: number) => {
        draggable: boolean;
        onDragStart: () => void;
        onDragEnter: () => void;
        onDragEnd: () => void;
        onDragOver: (e: React.DragEvent) => void;
    };
}

export function useDragReorder<T>(
    items: T[],
    onReorder: (items: T[]) => void
): UseDragReorderReturn {
    const dragItemRef = useRef<number | null>(null);
    const dragOverItemRef = useRef<number | null>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

    const getDragProps = (index: number) => ({
        draggable: true,
        onDragStart: () => handleDragStart(index),
        onDragEnter: () => handleDragEnter(index),
        onDragEnd: () => handleDragEnd(),
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
    });

    return {
        draggingIndex,
        dragOverIndex,
        handleDragStart,
        handleDragEnter,
        handleDragEnd,
        getDragProps,
    };
}
