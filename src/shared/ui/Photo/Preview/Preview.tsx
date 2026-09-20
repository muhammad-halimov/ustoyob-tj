import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clear } from '../../Button/Clear/Clear';
import styles from './Preview.module.scss';

interface PhotoGalleryProps {
    isOpen: boolean;
    images: string[];
    /** Лёгкие картинки для ленты миниатюр внизу (тот же порядок, что `images`). Без них лента
     *  грузила бы полноразмерные `images` ради маленьких квадратиков. */
    thumbnails?: string[];
    /** Лёгкие версии уже показанных на странице фото (тот же порядок, обычно они уже в кэше
     *  браузера). Окно открывается сразу с ними, а полное фото из `images` подменяет их, когда
     *  докачается (blur-up), — вместо пустого окна на время загрузки тяжёлого файла. */
    previews?: string[];
    /** Оригиналы (тот же порядок). Если вариант из `images` не загрузился (сбой генерации
     *  превью, битый кэш) — пробуем оригинал и только потом показываем заглушку. */
    originals?: string[];
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
    thumbnails,
    previews,
    originals,
    currentIndex,
    onClose,
    onNext,
    onPrevious,
    onSelectImage,
    fallbackImage = '/img/icons/misc/fonTest5.png'
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

    // Touch tracking для свайпа главного изображения
    const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);

    const handleSwipeTouchStart = (e: React.TouchEvent) => {
        swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleSwipeTouchEnd = (e: React.TouchEvent) => {
        if (!swipeTouchStart.current) return;
        const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x;
        const dy = Math.abs(e.changedTouches[0].clientY - swipeTouchStart.current.y);
        swipeTouchStart.current = null;
        // Минимум 50px по горизонтали и меньше 80px по вертикали
        if (Math.abs(dx) < 50 || dy > 80) return;
        if (dx < 0) onNext();
        else onPrevious();
    };

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

    // Progressive: полное фото качаем в фоне (new Image) и подменяем превью только когда оно
    // готово — иначе пустое окно, пока тянется/генерируется тяжёлый файл. Если полный вариант не
    // загрузился, пробуем оригинал; если и он — остаёмся на превью (лучше, чем заглушка).
    const [fullReady, setFullReady] = useState<{ index: number; src: string } | null>(null);
    const previewSrc = previews?.[currentIndex];
    const fullSrc = images[currentIndex];
    useEffect(() => {
        if (!isOpen || !previewSrc || previewSrc === fullSrc) return;
        let cancelled = false;
        const tryLoad = (candidates: string[]) => {
            const [src, ...rest] = candidates;
            if (!src) return;
            const probe = new Image();
            probe.onload = () => { if (!cancelled) setFullReady({ index: currentIndex, src }); };
            probe.onerror = () => { if (!cancelled) tryLoad(rest); };
            probe.src = src;
        };
        tryLoad([fullSrc, ...(originals?.[currentIndex] ? [originals[currentIndex]] : [])]);
        return () => { cancelled = true; };
    }, [isOpen, currentIndex, previewSrc, fullSrc, originals]);

    if (!isOpen || images.length === 0) {
        return null;
    }

    // Что показываем в главном окне: готовое полное фото → иначе превью → иначе полный (без превью).
    // src сверяем тоже: список images мог смениться (другой набор фото на том же индексе).
    const fullIsReady = fullReady?.index === currentIndex
        && (fullReady.src === fullSrc || fullReady.src === originals?.[currentIndex]);
    const mainSrc = fullIsReady ? fullReady.src : (previewSrc ?? fullSrc);

    // Цепочка отката: images[i] → originals[i] → заглушка. data-fallback помечает, что оригинал
    // уже пробовали, иначе при его собственной ошибке был бы бесконечный цикл.
    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, index?: number) => {
        const img = e.currentTarget;
        const original = index !== undefined ? originals?.[index] : undefined;
        if (original && img.dataset.fallback !== 'original' && img.getAttribute('src') !== original) {
            img.dataset.fallback = 'original';
            img.src = original;
            return;
        }
        img.src = fallbackImage;
    };

    const modalContent = (
        <div
            className={styles.photo_modal_overlay}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                onClose();
            }}
        >
            <div className={styles.photo_modal_content}
                onClick={(e) => e.stopPropagation()}
            >
                <Clear
                    className={styles.photo_modal_close}
                    onClick={onClose}
                />

                <div className={styles.photo_modal_main}
                    onTouchStart={handleSwipeTouchStart}
                    onTouchEnd={handleSwipeTouchEnd}
                >
                    {images.length > 1 && (
                        <button
                            className={styles.photo_modal_nav}
                            onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onPrevious(); }}
                            onMouseUp={() => onPrevious()}
                            aria-label="Предыдущее фото"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}

                    <div className={styles.photo_modal_image_container}>
                        <img
                            // key: при смене фото — новый элемент, чтобы data-fallback от
                            // предыдущего не блокировал откат на оригинал у следующего.
                            key={currentIndex}
                            src={mainSrc}
                            alt={`Фото ${currentIndex + 1}`}
                            className={styles.photo_modal_image}
                            onClick={(e) => e.stopPropagation()}
                            onError={(e) => handleImageError(e, currentIndex)}
                        />
                        {/* Preload только соседей и только когда текущее готово: раньше при открытии
                            параллельно качались ВСЕ фото галереи и мешали главному. */}
                        {(fullIsReady || !previewSrc) && images.map((src, i) => (
                            i !== currentIndex && images.length > 1
                            && (i === (currentIndex + 1) % images.length || i === (currentIndex - 1 + images.length) % images.length)
                        ) && (
                            <img key={i} src={src} style={{ display: 'none' }} alt="" aria-hidden />
                        ))}
                    </div>

                    {images.length > 1 && (
                        <button
                            className={styles.photo_modal_nav}
                            onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onNext(); }}
                            onMouseUp={() => onNext()}
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
                                    src={thumbnails?.[index] ?? image}
                                    alt={`Миниатюра ${index + 1}`}
                                    className={`${styles.photo_modal_thumbnail} ${index === currentIndex ? styles.active : ''}`}
                                    onTouchStart={handleThumbTouchStart}
                                    onTouchMove={handleThumbTouchMove}
                                    onTouchEnd={(e) => handleThumbTouchEnd(e, index)}
                                    onClick={(e) => { e.stopPropagation(); onSelectImage(index); }}
                                    onError={(e) => handleImageError(e, index)}
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