import React from 'react';
import { useDragReorder, DragHandle } from '../../../../widgets/DragReorder';
import styles from './Grid.module.scss';

export type PhotoItem =
    | { type: 'existing'; id: number; image: string }
    | { type: 'new'; file: File; previewUrl: string };

interface PhotoGridProps {
    photos: PhotoItem[];
    onChange: (photos: PhotoItem[]) => void;
    getImageUrl: (path: string) => string;
    onOpenGallery?: (existingIndex: number) => void;
    onClickPhoto?: (index: number) => void;
    inputId?: string;
    photoAlt?: string;
    disabled?: boolean;
}

const Grid: React.FC<PhotoGridProps> = ({
    photos,
    onChange,
    getImageUrl,
    onOpenGallery,
    onClickPhoto,
    inputId = 'photo-grid-upload',
    photoAlt = 'Photo',
    disabled = false,
}) => {
    const drag = useDragReorder(photos, onChange);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newItems: PhotoItem[] = Array.from(e.target.files).map(file => ({
                type: 'new' as const,
                file,
                previewUrl: URL.createObjectURL(file),
            }));
            onChange([...photos, ...newItems]);
            e.target.value = '';
        }
    };

    const removePhoto = (index: number) => {
        onChange(photos.filter((_, i) => i !== index));
    };

    return (
        <div className={styles.photoGrid}>
            {photos.map((photo, index) => (
                <div
                    key={photo.type === 'existing' ? `existing-${photo.id}` : `new-${index}`}
                    className={`${styles.photoItem} ${drag.draggingIndex === index ? styles.photoItemDragging : ''} ${drag.dragOverIndex === index ? styles.photoItemDragOver : ''}`}
                    onDragEnter={() => drag.handleDragEnter(index)}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <DragHandle
                        className={styles.dragHandleOverlay}
                        draggable
                        onDragStart={() => drag.handleDragStart(index)}
                        onDragEnd={() => drag.handleDragEnd()}
                    />
                    <img
                        src={photo.type === 'existing' ? getImageUrl(photo.image) : photo.previewUrl}
                        alt={`${photoAlt} ${index + 1}`}
                        onClick={
                            photo.type === 'existing' && onOpenGallery
                                ? () => onOpenGallery(
                                    photos.slice(0, index).filter(p => p.type === 'existing').length
                                  )
                                : onClickPhoto
                                    ? () => onClickPhoto(index)
                                    : undefined
                        }
                        style={(photo.type === 'existing' && onOpenGallery) || onClickPhoto ? { cursor: 'pointer' } : undefined}
                    />
                    <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className={styles.removePhotoButton}
                        disabled={disabled}
                    >
                        ×
                    </button>
                </div>
            ))}

            <div className={styles.photoAddBtn}>
                <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className={styles.fileInput}
                    id={inputId}
                    disabled={disabled}
                />
                <label htmlFor={inputId} className={styles.uploadLabel}>
                    <span className={styles.plusIcon}>+</span>
                </label>
            </div>
        </div>
    );
};

export default Grid;
