import React from 'react';
import { useDragReorder, DragHandle } from '../../../../../widgets/DragReorder';
import { EmptyState } from '../../../../../widgets/EmptyState';
import styles from './ProfileSection.module.scss';

interface SectionItemInnerProps {
    stableKey: string;
    item: unknown;
    isEditing: boolean;
    renderContent: () => React.ReactNode;
}

/** Memoized wrapper — only re-renders when stableKey or item reference changes.
 *  When the item is actively being edited, always re-renders so controlled inputs work. */
const SectionItemInner = React.memo(
    ({ renderContent }: SectionItemInnerProps) => <>{renderContent()}</>,
    (prev, next) => {
        if (next.isEditing) return false;
        return prev.stableKey === next.stableKey && prev.item === next.item;
    }
);

interface ProfileSectionProps<T extends { id: string | number }> {
    title: string;
    items: T[];
    editingId: string | null;
    readOnly?: boolean;
    isLoading?: boolean;
    emptyTitle?: string;
    onAdd?: () => void;
    onReorder?: (items: T[]) => void;
    onRefresh?: () => void;
    /** Renders the item content in view mode (inside the item wrapper) */
    renderViewItem: (item: T, index: number) => React.ReactNode;
    /** Renders inline edit form for an existing item (replaces the whole item wrapper content) */
    renderEditItem?: (item: T) => React.ReactNode;
    /** Form shown at the bottom when editingId starts with 'new-' */
    renderNewForm?: () => React.ReactNode;
    /** When true, wraps renderNewForm in the same item container as existing items */
    wrapNewFormAsItem?: boolean;
    /** Extra slot rendered between the title and the list (e.g. remote-work toggle, auth banner) */
    headerSlot?: React.ReactNode;
    /** Extra slot rendered at the bottom of the content area (e.g. reset/upload buttons) */
    footerSlot?: React.ReactNode;
    /** id of the item currently being deleted/loading — only that item re-renders */
    busyItemId?: string | null;
    /** When true, suppresses the EmptyState when items is empty (e.g. auth banner is shown instead) */
    hideEmpty?: boolean;
    className?: string;
}

export function ProfileSection<T extends { id: string | number }>({ 
    title,
    items,
    editingId,
    readOnly = false,
    isLoading = false,
    emptyTitle = '',
    onAdd,
    onReorder,
    onRefresh,
    renderViewItem,
    renderEditItem,
    renderNewForm,
    wrapNewFormAsItem = false,
    headerSlot,
    footerSlot,
    busyItemId,
    hideEmpty = false,
    className,
}: ProfileSectionProps<T>) {
    const drag = useDragReorder(items, onReorder ?? (() => {}));
    const isAddingNew = editingId !== null && (editingId === 'new' || editingId.startsWith('new-'));

    return (
        <div className={`${styles.section}${className ? ` ${className}` : ''}`}>
            <h3>{title}</h3>
            {headerSlot}
            <div className={styles.content}>
                {items.length > 0 ? (
                    items.map((item, index) => (
                        <div
                            key={String(item.id)}
                            className={[
                                styles.item,
                                (index === items.length - 1 && !isAddingNew) ? styles.item_last : '',
                                !readOnly && onReorder && drag.draggingIndex === index ? styles.dragging : '',
                                !readOnly && onReorder && drag.dragOverIndex === index ? styles.drag_over : '',
                            ].join(' ')}
                            {...(!readOnly && onReorder && editingId !== String(item.id) ? drag.getDragProps(index) : {})}
                        >
                            <SectionItemInner
                                stableKey={`${String(item.id)}-${editingId === String(item.id) ? '1' : '0'}-${busyItemId != null && busyItemId === String(item.id) ? '1' : '0'}`}
                                item={item}
                                isEditing={editingId === String(item.id)}
                                renderContent={() => (
                                    editingId !== null && editingId === String(item.id) && renderEditItem ? (
                                        renderEditItem(item)
                                    ) : (
                                        <>
                                            {!readOnly && onReorder && <DragHandle />}
                                            {renderViewItem(item, index)}
                                        </>
                                    )
                                )}
                            />
                        </div>
                    ))
                ) : (
                    !isAddingNew && !editingId && !hideEmpty && (
                        <EmptyState isLoading={isLoading} title={emptyTitle} onRefresh={onRefresh} />
                    )
                )}

                {isAddingNew && renderNewForm && (
                    wrapNewFormAsItem ? (
                        <div className={[styles.item, styles.item_last].join(' ')}>
                            {renderNewForm()}
                        </div>
                    ) : renderNewForm()
                )}

                {!readOnly && onAdd && !editingId && (
                    <div className={styles.add_container}>
                        <button className={styles.add_btn} onClick={onAdd}>+</button>
                    </div>
                )}
                {footerSlot}
            </div>
        </div>
    );
}
