import React, { useMemo, useEffect } from 'react';
import styles from './PhotoPicker.module.scss';
import { Preview, usePreview } from '../Preview';

interface PhotoPickerProps {
    photos: File[];
    onChange: (photos: File[]) => void;
    disabled?: boolean;
    inputId?: string;
}

const PhotoPicker: React.FC<PhotoPickerProps> = ({
    photos,
    onChange,
    disabled = false,
    inputId = 'photo-picker-input',
}) => {
    const previewUrls = useMemo(() => photos.map(f => URL.createObjectURL(f)), [photos]);
    useEffect(() => () => { previewUrls.forEach(u => URL.revokeObjectURL(u)); }, [previewUrls]);
    const gallery = usePreview({ images: previewUrls });

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            onChange([...photos, ...files]);
            e.target.value = '';
        }
    };

    const removePhoto = (index: number) => {
        onChange(photos.filter((_, i) => i !== index));
    };

    return (
        <>
            <Preview
                isOpen={gallery.isOpen}
                images={previewUrls}
                currentIndex={gallery.currentIndex}
                onClose={gallery.closeGallery}
                onNext={gallery.goToNext}
                onPrevious={gallery.goToPrevious}
                onSelectImage={gallery.selectImage}
            />
            <div className={styles.photoPreviews}>
                {photos.map((_, index) => (
                    <div key={index} className={styles.photoPreview}>
                        <img
                            src={previewUrls[index]}
                            alt={`Preview ${index + 1}`}
                            onClick={() => gallery.openGallery(index)}
                            style={{ cursor: 'pointer' }}
                        />
                        <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className={styles.removePhoto}
                            disabled={disabled}
                        >
                            ×
                        </button>
                    </div>
                ))}

                <div className={styles.photoUpload}>
                    <input
                        type="file"
                        id={inputId}
                        multiple
                        accept="image/*"
                        onChange={handleUpload}
                        className={styles.fileInput}
                        disabled={disabled}
                    />
                    <label htmlFor={inputId} className={styles.photoUploadButton}>
                        +
                    </label>
                </div>
            </div>
        </>
    );
};

export default PhotoPicker;
