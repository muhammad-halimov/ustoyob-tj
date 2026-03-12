import React from 'react';
import styles from './DragHandle.module.scss';

interface DragHandleProps {
    className?: string;
    title?: string;
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

export const DragHandle: React.FC<DragHandleProps> = ({
    className,
    title = 'Перетащите для изменения порядка',
    draggable,
    onDragStart,
    onDragEnd,
}) => (
    <div
        className={`${styles.drag_handle}${className ? ` ${className}` : ''}`}
        title={title}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
    >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none">
            <circle cx="4" cy="3" r="2" fill="currentColor"/>
            <circle cx="10" cy="3" r="2" fill="currentColor"/>
            <circle cx="4" cy="10" r="2" fill="currentColor"/>
            <circle cx="10" cy="10" r="2" fill="currentColor"/>
            <circle cx="4" cy="17" r="2" fill="currentColor"/>
            <circle cx="10" cy="17" r="2" fill="currentColor"/>
        </svg>
    </div>
);
