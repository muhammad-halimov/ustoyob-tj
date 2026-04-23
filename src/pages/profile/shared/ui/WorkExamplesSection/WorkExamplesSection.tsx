import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShowMore } from '../../../../../shared/ui/Button/ShowMore/ShowMore';
import { Preview } from '../../../../../shared/ui/Photo/Preview';
import { SectionActions } from '../../../../../shared/ui/SectionActions';
import { useDragReorder, DragHandle } from '../../../../../widgets/DragReorder';
import { ProfileSection } from '../ProfileSection';
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
    onReorder?: (workExamples: WorkExample[]) => void;
    onRefresh?: () => void;
    isLoading?: boolean;
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
    onReorder,
    onRefresh,
    isLoading = false,
}) => {
    const workExampleInputRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation(['profile', 'common']);
    const workDrag = useDragReorder(workExamples, onReorder ?? (() => {}));

    // Single synthetic item to hold the gallery grid inside ProfileSection
    const galleryItems = workExamples.length > 0 ? [{ id: 'gallery' as const }] : [];

    return (
        <>
            <ProfileSection<{ id: string }>
                title={t('profile:workExamplesTitle')}
                items={galleryItems}
                editingId={null}
                readOnly={true}
                isLoading={isLoading}
                emptyTitle={readOnly ? t('profile:noWorkExamples') : t('profile:addWorkExamples')}
                onRefresh={onRefresh}
                renderViewItem={() => (
                    <div style={{ width: '100%' }}>
                        <div className={styles.work_examples_grid}>
                            {workExamples
                                .slice(0, showAllWorkExamples ? undefined : (isMobile ? 6 : 8))
                                .map((work, index) => (
                                    <div
                                        key={work.id}
                                        className={`${styles.work_example} ${!readOnly && onReorder && workDrag.draggingIndex === index ? styles.dragging : ''} ${!readOnly && onReorder && workDrag.dragOverIndex === index ? styles.drag_over : ''}`}
                                        onDragEnter={!readOnly && onReorder ? () => workDrag.handleDragEnter(index) : undefined}
                                        onDragEnd={!readOnly && onReorder ? () => workDrag.handleDragEnd() : undefined}
                                        onDragOver={!readOnly && onReorder ? (e) => e.preventDefault() : undefined}
                                    >
                                        {!readOnly && onReorder && (
                                            <DragHandle
                                                className={styles.drag_handle_overlay}
                                                draggable
                                                onDragStart={() => workDrag.handleDragStart(index)}
                                            />
                                        )}
                                        <img
                                            src={getImageUrlWithCacheBust(work.image)}
                                            alt={work.title}
                                            onClick={() => onOpenGallery(index)}
                                            style={{ cursor: 'pointer' }}
                                            onError={(e) => {
                                                const img = e.currentTarget;
                                                const alternativePaths = [
                                                    `${API_BASE_URL}/uploads/gallery_images/${work.image.split('/').pop() || work.image}`,
                                                    './fonTest6.png'
                                                ];
                                                let currentIndex = 0;
                                                const tryNextSource = () => {
                                                    if (currentIndex < alternativePaths.length) {
                                                        const nextSource = alternativePaths[currentIndex];
                                                        currentIndex++;
                                                        const testImg = new Image();
                                                        testImg.onload = () => { img.src = nextSource; };
                                                        testImg.onerror = () => { tryNextSource(); };
                                                        testImg.src = nextSource;
                                                    } else {
                                                        img.src = './fonTest6.png';
                                                    }
                                                };
                                                tryNextSource();
                                            }}
                                        />
                                        {!readOnly && (
                                            <button
                                                className={styles.delete_work_button}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteWorkExample(work.id);
                                                }}
                                                title={t('profile:deletePhotoTitle')}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                        </div>
                        {workExamples.length > (isMobile ? 6 : 8) && (
                            <ShowMore
                                expanded={showAllWorkExamples}
                                canLoadMore={!showAllWorkExamples}
                                onShowMore={() => setShowAllWorkExamples(true)}
                                onShowLess={() => setShowAllWorkExamples(false)}
                                onClear={() => setShowAllWorkExamples(false)}
                                showMoreText={t('common:app.showMore')}
                                showLessText={t('common:app.showLess')}
                            />
                        )}
                    </div>
                )}
                footerSlot={!readOnly ? (
                    <SectionActions
                        onAdd={() => !isGalleryOperating && workExampleInputRef.current?.click()}
                        onDeleteAll={onDeleteAllWorkExamples}
                        showDeleteAll={workExamples.length > 0}
                        addTitle={t('profile:addPhotosTitle')}
                        deleteAllTitle={t('profile:deleteAllPhotosTitle')}
                        deleteAllText={t('profile:deleteAllPhotos')}
                        disabled={isGalleryOperating}
                        isLoading={isGalleryOperating}
                    />
                ) : undefined}
            />
            <input
                type="file"
                ref={workExampleInputRef}
                onChange={onWorkExampleUpload}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
            />
            <Preview
                isOpen={isGalleryOpen}
                images={galleryImages}
                currentIndex={galleryCurrentIndex}
                onClose={onCloseGallery}
                onNext={onGalleryNext}
                onPrevious={onGalleryPrevious}
                onSelectImage={onSelectGalleryImage}
            />
        </>
    );
};
