import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Preview.module.scss';

interface PhotoGalleryProps {
    isOpen: boolean;
    images: string[];
    currentIndex: number;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    onSelectImage: (index: number) => void;
    fallbackImage?: string;
}

export const Preview: React.FC<PhotoGalleryProps> = ({
    isOpen,
    images,
    currentIndex,
    onClose,
    onNext,
    onPrevious,
    onSelectImage,
    fallbackImage = '../fonTest5.png'
}) => {
    // Обработчик нажатия клавиш
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch(e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    onPrevious();
                    break;
                case 'ArrowRight':
                    onNext();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, onNext, onPrevious]);

    // Блокировка скролла страницы при открытии модального окна
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Восстанавливаем скролл при размонтировании
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    // Touch tracking для миниатюр — не открывать при скролле
    const thumbTouchStart = useRef<{ x: number; y: number } | null>(null);
    const thumbScrolled = useRef(false);

    const handleThumbTouchStart = (e: React.TouchEvent) => {
        thumbTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        thumbScrolled.current = false;
    };

    const handleThumbTouchMove = (e: React.TouchEvent) => {
        if (!thumbTouchStart.current) return;
        const dx = Math.abs(e.touches[0].clientX - thumbTouchStart.current.x);
        const dy = Math.abs(e.touches[0].clientY - thumbTouchStart.current.y);
        if (dx > 6 || dy > 6) thumbScrolled.current = true;
    };

    const handleThumbTouchEnd = (e: React.TouchEvent, index: number) => {
        if (thumbScrolled.current) return;
        e.preventDefault(); // suppress the synthetic click the browser fires after touchend
        e.stopPropagation();
        onSelectImage(index);
    };

    if (!isOpen || images.length === 0) {
        return null;
    }

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.src = fallbackImage;
    };

    const modalContent = (
        <div className={styles.photo_modal_overlay} onClick={onClose}>
            <div className={styles.photo_modal_content}>
                <button
                    className={styles.photo_modal_close}
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    aria-label="Закрыть"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </button>

                <div className={styles.photo_modal_main}>
                    {images.length > 1 && (
                        <button
                            className={styles.photo_modal_nav}
                            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                            aria-label="Предыдущее фото"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}

                    <div className={styles.photo_modal_image_container}>
                        <img
                            src={images[currentIndex]}
                            alt={`Фото ${currentIndex + 1}`}
                            className={styles.photo_modal_image}
                            onClick={(e) => e.stopPropagation()}
                            onError={handleImageError}
                        />
                    </div>

                    {images.length > 1 && (
                        <button
                            className={styles.photo_modal_nav}
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            aria-label="Следующее фото"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9 18L15 12L9 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}
                </div>

                {images.length > 1 && (
                    <>
                        <div className={styles.photo_modal_counter}>
                            {currentIndex + 1} / {images.length}
                        </div>

                        <div className={styles.photo_modal_thumbnails}>
                            {images.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`Миниатюра ${index + 1}`}
                                    className={`${styles.photo_modal_thumbnail} ${index === currentIndex ? styles.active : ''}`}
                                    onTouchStart={handleThumbTouchStart}
                                    onTouchMove={handleThumbTouchMove}
                                    onTouchEnd={(e) => handleThumbTouchEnd(e, index)}
                                    onClick={(e) => { e.stopPropagation(); onSelectImage(index); }}
                                    onError={handleImageError}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};