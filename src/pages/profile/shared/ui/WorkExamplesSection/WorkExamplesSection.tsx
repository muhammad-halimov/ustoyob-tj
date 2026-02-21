import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoGallery } from '../../../../../shared/ui/PhotoGallery';
import styles from './WorkExamplesSection.module.scss';

interface WorkExample {
    id: string;
    image: string;
    title: string;
}

interface WorkExamplesSectionProps {
    workExamples: WorkExample[];
    showAllWorkExamples: boolean;
    isMobile: boolean;
    isGalleryOperating: boolean;
    isGalleryOpen: boolean;
    galleryImages: string[];
    galleryCurrentIndex: number;
    readOnly?: boolean;
    onOpenGallery: (index: number) => void;
    onCloseGallery: () => void;
    onGalleryNext: () => void;
    onGalleryPrevious: () => void;
    onSelectGalleryImage: (index: number) => void;
    onDeleteWorkExample: (id: string) => Promise<void>;
    onDeleteAllWorkExamples: () => Promise<void>;
    onWorkExampleUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    setShowAllWorkExamples: (show: boolean) => void;
    getImageUrlWithCacheBust: (url: string) => string;
    API_BASE_URL: string;
}

export const WorkExamplesSection: React.FC<WorkExamplesSectionProps> = ({
    workExamples,
    showAllWorkExamples,
    isMobile,
    isGalleryOperating,
    isGalleryOpen,
    galleryImages,
    galleryCurrentIndex,
    readOnly = false,
    onOpenGallery,
    onCloseGallery,
    onGalleryNext,
    onGalleryPrevious,
    onSelectGalleryImage,
    onDeleteWorkExample,
    onDeleteAllWorkExamples,
    onWorkExampleUpload,
    setShowAllWorkExamples,
    getImageUrlWithCacheBust,
    API_BASE_URL,
}) => {
    const workExampleInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation(['profile']);

    return (
        <div className={styles.section_item}>
            <h3>{t('profile:workExamplesTitle')}</h3>
            <div className={styles.section_content}>
                <div className={styles.work_examples}>
                    {workExamples.length > 0 ? (
                        <>
                            <div className={styles.work_examples_grid}>
                                {workExamples
                                    .slice(0, showAllWorkExamples ? undefined : (isMobile ? 6 : 8))
                                    .map((work, index) => (
                                        <div key={work.id} className={styles.work_example}>
                                            <img
                                                src={getImageUrlWithCacheBust(work.image)}
                                                alt={work.title}
                                                onClick={() => onOpenGallery(index)}
                                                style={{ cursor: 'pointer' }}
                                                onError={(e) => {
                                                    const img = e.currentTarget;
                                                    const alternativePaths = [
                                                        `${API_BASE_URL}/uploads/gallery_images/${work.image.split('/').pop() || work.image}`,
                                                        "./fonTest6.png"
                                                    ];

                                                    let currentIndex = 0;
                                                    const tryNextSource = () => {
                                                        if (currentIndex < alternativePaths.length) {
                                                            const nextSource = alternativePaths[currentIndex];
                                                            currentIndex++;

                                                            const testImg = new Image();
                                                            testImg.onload = () => {
                                                                img.src = nextSource;
                                                            };
                                                            testImg.onerror = () => {
                                                                tryNextSource();
                                                            };
                                                            testImg.src = nextSource;
                                                        } else {
                                                            img.src = "./fonTest6.png";
                                                        }
                                                    };

                                                    tryNextSource();
                                                }}
                                            />
                                            {!readOnly && <button
                                                className={styles.delete_work_button}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteWorkExample(work.id);
                                                }}
                                                title={t('profile:deletePhotoTitle')}
                                            >
                                                ×
                                            </button>}
                                        </div>
                                    ))}
                            </div>
                            {workExamples.length > (isMobile ? 6 : 8) && (
                                <button
                                    className={styles.show_more_work_button}
                                    onClick={() => setShowAllWorkExamples(!showAllWorkExamples)}
                                >
                                    {showAllWorkExamples ? t('profile:hideAll') : t('profile:showAll', { count: workExamples.length })}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className={styles.empty_state}>
                            <span>{readOnly ? t('profile:noWorkExamples') : t('profile:addWorkExamples')}</span>
                        </div>
                    )}
                </div>

                {/* Кнопки управления портфолио */}
                {!readOnly && <div className={styles.add_education_container}>
                    {workExamples.length > 0 && (
                        <button
                            className={styles.reset_social_btn}
                            onClick={onDeleteAllWorkExamples}
                            disabled={isGalleryOperating}
                            title={t('profile:deleteAllPhotosTitle')}
                        >
                            {t('profile:deleteAllPhotos')}
                        </button>
                    )}
                    <button
                        className={styles.add_button}
                        onClick={() => workExampleInputRef.current?.click()}
                        title={t('profile:addPhotosTitle')}
                    >
                        +
                    </button>
                </div>}
            </div>
            <input
                type="file"
                ref={workExampleInputRef}
                onChange={onWorkExampleUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
            />

            {/* PhotoGallery для примеров работ */}
            <PhotoGallery
                isOpen={isGalleryOpen}
                images={galleryImages}
                currentIndex={galleryCurrentIndex}
                onClose={onCloseGallery}
                onNext={onGalleryNext}
                onPrevious={onGalleryPrevious}
                onSelectImage={onSelectGalleryImage}
            />
        </div>
    );
};
