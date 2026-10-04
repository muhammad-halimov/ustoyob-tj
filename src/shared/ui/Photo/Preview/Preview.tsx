import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Clear } from '../../Button/Clear/Clear';
import styles from './Preview.module.scss';
import { runNativeTransition } from '../../../../utils/nativeMotion';

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
    const { t } = useTranslation('common');
    // Мобильная сборка: листание — снимок уезжает в сторону листания (utils/nativeMotion.ts); на сайте — как раньше.
    // Одно фото листать некуда: без этого свайп «перелистывал» его само на себя — с анимацией.
    const showNext = () => { if (images.length > 1) runNativeTransition('gallery-next', onNext); };
    const showPrevious = () => { if (images.length > 1) runNativeTransition('gallery-prev', onPrevious); };
    const showImage = (index: number) => runNativeTransition(
        index > currentIndex ? 'gallery-next' : index < currentIndex ? 'gallery-prev' : 'none',
        () => onSelectImage(index),
    );
    // Обработчик нажатия клавиш
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch(e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    showPrevious();
                    break;
                case 'ArrowRight':
                    showNext();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const pinchStart = useRef<{ distance: number; x: number; y: number; scale: number } | null>(null);
    const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const touchPanStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
    const [view, setView] = useState({ scale: 1, rotation: 0, x: 0, y: 0 });

    useEffect(() => {
        setView({ scale: 1, rotation: 0, x: 0, y: 0 });
        pinchStart.current = null;
        dragStart.current = null;
        touchPanStart.current = null;
    }, [isOpen, currentIndex]);

    const clampScale = (scale: number) => Math.min(4, Math.max(1, scale));
    const clampPan = (x: number, y: number, scale: number) => {
        if (scale <= 1) return { x: 0, y: 0 };
        const bounds = imageContainerRef.current?.getBoundingClientRect();
        if (!bounds) return { x, y };
        const rotated = view.rotation % 180 !== 0;
        const maxX = ((rotated ? bounds.height : bounds.width) * (scale - 1)) / 2;
        const maxY = ((rotated ? bounds.width : bounds.height) * (scale - 1)) / 2;
        return {
            x: Math.max(-maxX, Math.min(maxX, x)),
            y: Math.max(-maxY, Math.min(maxY, y)),
        };
    };
    const changeZoom = (amount: number) => {
        setView(current => {
            const scale = clampScale(current.scale + amount);
            const pan = clampPan(current.x, current.y, scale);
            return { ...current, scale, ...pan };
        });
    };

    const handleImageWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        changeZoom(e.deltaY < 0 ? 0.2 : -0.2);
    };

    const handlePinchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && view.scale > 1) {
            swipeTouchStart.current = null;
            touchPanStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: view.x, panY: view.y };
            return;
        }
        if (e.touches.length !== 2) return;
        touchPanStart.current = null;
        swipeTouchStart.current = null;
        const [first, second] = Array.from(e.touches);
        pinchStart.current = {
            distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
            x: (first.clientX + second.clientX) / 2,
            y: (first.clientY + second.clientY) / 2,
            scale: view.scale,
        };
    };

    const handlePinchMove = (e: React.TouchEvent) => {
        if (touchPanStart.current && e.touches.length === 1) {
            e.preventDefault();
            const start = touchPanStart.current;
            setView(current => {
                const pan = clampPan(start.panX + e.touches[0].clientX - start.x, start.panY + e.touches[0].clientY - start.y, current.scale);
                return { ...current, ...pan };
            });
            return;
        }
        if (!pinchStart.current || e.touches.length !== 2) return;
        e.preventDefault();
        const [first, second] = Array.from(e.touches);
        const midpointX = (first.clientX + second.clientX) / 2;
        const midpointY = (first.clientY + second.clientY) / 2;
        const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
        const start = pinchStart.current;
        const scale = clampScale(start.scale * distance / start.distance);
        setView(current => {
            const pan = clampPan(current.x + midpointX - start.x, current.y + midpointY - start.y, scale);
            return { ...current, scale, ...pan };
        });
        pinchStart.current = { ...start, distance, x: midpointX, y: midpointY, scale };
    };

    const handlePinchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) pinchStart.current = null;
        if (e.touches.length === 0) touchPanStart.current = null;
    };

    const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse' || view.scale <= 1) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragStart.current = { x: e.clientX, y: e.clientY, panX: view.x, panY: view.y };
    };

    const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const start = dragStart.current;
        if (!start) return;
        setView(current => {
            const pan = clampPan(start.panX + e.clientX - start.x, start.panY + e.clientY - start.y, current.scale);
            return { ...current, ...pan };
        });
    };

    const handleImagePointerUp = () => { dragStart.current = null; };

    const handleSwipeTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length !== 1 || view.scale > 1) {
            swipeTouchStart.current = null;
            return;
        }
        swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const handleSwipeTouchEnd = (e: React.TouchEvent) => {
        if (!swipeTouchStart.current) return;
        const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x;
        const dy = Math.abs(e.changedTouches[0].clientY - swipeTouchStart.current.y);
        swipeTouchStart.current = null;
        // Минимум 50px по горизонтали и меньше 80px по вертикали
        if (Math.abs(dx) < 50 || dy > 80) return;
        if (dx < 0) showNext();
        else showPrevious();
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
        showImage(index);
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
                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); showPrevious(); }}
                            onMouseUp={() => showPrevious()}
                            aria-label="Предыдущее фото"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}

                    <div
                        ref={imageContainerRef}
                        className={styles.photo_modal_image_container}
                        onWheel={handleImageWheel}
                        onTouchStart={handlePinchStart}
                        onTouchMove={handlePinchMove}
                        onTouchEnd={handlePinchEnd}
                        onPointerDown={handleImagePointerDown}
                        onPointerMove={handleImagePointerMove}
                        onPointerUp={handleImagePointerUp}
                        onPointerCancel={handleImagePointerUp}
                    >
                        <img
                            // key: при смене фото — новый элемент, чтобы data-fallback от
                            // предыдущего не блокировал откат на оригинал у следующего.
                            key={currentIndex}
                            src={mainSrc}
                            alt={`Фото ${currentIndex + 1}`}
                            className={`${styles.photo_modal_image} ${view.scale > 1 ? styles.zoomed : ''}`}
                            style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale}) rotate(${view.rotation}deg)` }}
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

                    <div className={styles.photo_modal_tools} onClick={e => e.stopPropagation()}>
                        <button type="button" onClick={() => changeZoom(-0.25)} disabled={view.scale <= 1} aria-label={t('app.zoomOut')} title={t('app.zoomOut')}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5M7.5 10.8h6.6"/></svg>
                        </button>
                        <span className={styles.photo_modal_zoom_value}>{Math.round(view.scale * 100)}%</span>
                        <button type="button" onClick={() => changeZoom(0.25)} disabled={view.scale >= 4} aria-label={t('app.zoomIn')} title={t('app.zoomIn')}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5M7.5 10.8h6.6m-3.3-3.3v6.6"/></svg>
                        </button>
                        <button type="button" onClick={() => setView(current => ({ ...current, rotation: (current.rotation + 90) % 360 }))} aria-label={t('app.rotatePhoto')} title={t('app.rotatePhoto')}>
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.5-4L3 10m0-5v5h5M4 13a8 8 0 0 0 14.5 4L21 14m0 5v-5h-5"/></svg>
                        </button>
                    </div>

                    {images.length > 1 && (
                        <button
                            className={styles.photo_modal_nav}
                            onClick={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); showNext(); }}
                            onMouseUp={() => showNext()}
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
                                    onClick={(e) => { e.stopPropagation(); showImage(index); }}
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
