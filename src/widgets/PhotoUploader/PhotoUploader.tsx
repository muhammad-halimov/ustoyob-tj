import React, { useCallback } from 'react';
import styles from '../../pages/profile/clientProfilePage/ClientProfilePage.module.scss';

interface PhotoUploaderProps {
    photos: File[];
    onPhotosChange: (photos: File[]) => void;
    maxPhotos?: number;
    label?: string;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
                                                         photos,
                                                         onPhotosChange,
                                                         maxPhotos = 10,
                                                         label = 'Приложите фото'
                                                     }) => {
    const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const newFiles = Array.from(e.target.files);
        const updatedPhotos = [...photos, ...newFiles].slice(0, maxPhotos);
        onPhotosChange(updatedPhotos);
    }, [photos, onPhotosChange, maxPhotos]);

    const removePhoto = useCallback((index: number) => {
        onPhotosChange(photos.filter((_, i) => i !== index));
    }, [photos, onPhotosChange]);

    return (
        <div className={styles.photoSection}>
            <label>{label}</label>
            <div className={styles.photoUploadContainer}>
                <div className={styles.photoPreviews}>
                    {photos.map((photo, index) => (
                        <div key={index} className={styles.photoPreview}>
                            <img src={URL.createObjectURL(photo)} alt={`Preview ${index + 1}`} />
                            <button type="button" onClick={() => removePhoto(index)}>×</button>
                        </div>
                    ))}

                    {photos.length < maxPhotos && (
                        <div className={styles.photoUpload}>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className={styles.fileInput}
                            />
                            <label className={styles.photoUploadButton}>+</label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhotoUploader;