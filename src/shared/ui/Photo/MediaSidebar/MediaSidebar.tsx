import { IoImages, IoEye, IoTrashOutline } from 'react-icons/io5';
import { Clear } from '../../Button/Clear/Clear';
import styles from './MediaSidebar.module.scss';

export interface MediaSidebarImage {
    id: number | string;
    url: string;
    /** True when the current viewer is allowed to delete this specific image (their own upload) — offers the trash button on it when `onDeleteImage` is also given. */
    deletable?: boolean;
}

export interface MediaSidebarProps {
    images: MediaSidebarImage[];
    /** Expanded on desktop / shown as a centered sheet on mobile. Collapses to width:0 otherwise. */
    isOpen: boolean;
    onClose: () => void;
    /** Opens the full-screen Preview gallery at this thumbnail's index. */
    onOpenGallery: (index: number) => void;
    /** Already-translated header text, e.g. "Фото (3)". */
    title: string;
    /** Already-translated title attr for the "expand to gallery" button. */
    galleryButtonLabel?: string;
    thumbnailAlt?: (index: number) => string;
    /** Swapped in on broken thumbnails. */
    fallbackImageSrc?: string;
    /** Lets a consumer size/position the panel for its own layout (e.g. bound it to a shorter thread view). */
    className?: string;
    /**
     * Deletes one image directly from the panel — shown only on thumbnails whose `deletable`
     * is true (the caller decides ownership: chat message author, tech-support ticket/message
     * author, etc.). Omit to keep the panel read-only, e.g. for a viewer with nothing here to
     * delete. The caller does the actual PATCH/refetch; this just reports which one was picked.
     */
    onDeleteImage?: (image: MediaSidebarImage) => void;
    /** Already-translated title/aria-label for the per-thumbnail delete button. */
    deleteButtonLabel?: string;
}

/**
 * Collapsible sidebar of every image attached to a conversation — thumbnails open the
 * full-screen gallery (`Preview`/`usePreview`, supplied by the caller via `onOpenGallery`).
 * Shared between Chat and Tech Support's thread view so the panel/backdrop/thumbnail-grid
 * markup and styling exist in one place. Renders nothing when there are no images — the
 * caller is still responsible for hiding its own toggle button in that case.
 */
export function MediaSidebar({
    images,
    isOpen,
    onClose,
    onOpenGallery,
    title,
    galleryButtonLabel,
    thumbnailAlt,
    fallbackImageSrc = '/img/icons/misc/fonTest5.png',
    className,
    onDeleteImage,
    deleteButtonLabel,
}: MediaSidebarProps) {
    if (images.length === 0) return null;

    return (
        <>
            {isOpen && <div className={styles.backdrop} onClick={onClose} />}
            <div className={`${styles.sidebar} ${!isOpen ? styles.collapsed : ''} ${isOpen ? styles.mobileOpen : ''} ${className ?? ''}`}>
                <div className={styles.header}>
                    <IoImages />
                    <span className={styles.headerTitle}>{title}</span>
                    <button
                        type="button"
                        className={styles.galleryBtn}
                        onClick={() => onOpenGallery(0)}
                        title={galleryButtonLabel}
                        aria-label={galleryButtonLabel}
                    >⤢</button>
                    <Clear className={styles.closeBtn} onClick={onClose} />
                </div>
                <div className={styles.thumbnails}>
                    {images.map((image, index) => (
                        <div key={image.id} className={styles.thumbnail} onClick={() => onOpenGallery(index)}>
                            <img
                                src={image.url}
                                alt={thumbnailAlt?.(index) ?? ''}
                                className={styles.thumbnailImage}
                                onError={e => { e.currentTarget.src = fallbackImageSrc; }}
                            />
                            <div className={styles.thumbnailOverlay}>
                                <IoEye />
                            </div>
                            {image.deletable && onDeleteImage && (
                                <button
                                    type="button"
                                    className={styles.deleteBtn}
                                    onClick={e => { e.stopPropagation(); onDeleteImage(image); }}
                                    title={deleteButtonLabel}
                                    aria-label={deleteButtonLabel}
                                >
                                    <IoTrashOutline />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
