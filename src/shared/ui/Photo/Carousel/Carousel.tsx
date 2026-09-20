import { useMemo, useRef, useState } from 'react';
import type * as React from 'react';
import styles from './Carousel.module.scss';
import { Preview } from '../Preview';
import { blurhashToDataUrl } from '../../../../utils/blurhashUtils';
import type { PhotoSource } from '../../../../entities';

const THUMB_PER_PAGE = 4;
const TOUCH_SCROLL_THRESHOLD = 10;
const SWIPE_THRESHOLD = 40;

interface PhotoCarouselProps {
  /** Оригиналы (fallback и то, что видно, если `sources` не переданы). */
  photos: string[];
  /** Те же фото с превью/WebP/BlurHash от бэка (тот же порядок, что `photos`). С ними главное
   *  фото — лёгкое WebP-превью поверх мгновенной BlurHash-заглушки, а полный файл нужен
   *  только в полноэкранной галерее. */
  sources?: PhotoSource[];
  /** Вариант главного фото: `thumbnail` (480 px) для карточек лент, `medium` (800 px) для
   *  детальной страницы. */
  variant?: 'thumbnail' | 'medium';
  className?: string;
  /** Главное фото грузить сразу (hero на странице тикета). По умолчанию — lazy: карусель в основном
   *  живёт в карточках лент, где фото вне экрана не должны качаться заранее. */
  priority?: boolean;
}

export function Carousel({ photos, sources, variant = 'medium', className, priority = false }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [thumbOffset, setThumbOffset] = useState(0);
  const touchState = useRef<{ x: number; y: number; dx: number; scrolled: boolean } | null>(null);

  // sources используем только если они строго параллельны photos (вызывающий мог отфильтровать пустые URL).
  const usableSources = sources && sources.length === photos.length ? sources : undefined;
  const src = (i: number): PhotoSource | undefined => usableSources?.[i];
  const mainSrc = (i: number): string => {
    const s = src(i);
    if (!s) return photos[i];
    return (variant === 'thumbnail' ? s.thumbnail ?? s.medium : s.medium) ?? s.url;
  };
  // В галерее (Preview) — WebP оригинала (≤2400 px, заметно легче исходного PNG/JPEG).
  const galleryImages = useMemo(
    () => (usableSources ? usableSources.map(s => s.webp ?? s.url) : photos),
    [usableSources, photos],
  );
  // Превью для мгновенного открытия галереи: ровно те же файлы, что уже показаны на странице
  // (см. mainSrc), поэтому они в кэше браузера и окно не пустует, пока грузится полное фото.
  const galleryPreviews = useMemo(
    () => usableSources?.map(s => (variant === 'thumbnail' ? s.thumbnail ?? s.medium : s.medium) ?? s.url),
    [usableSources, variant],
  );
  const galleryThumbnails = useMemo(
    () => usableSources?.map(s => s.thumbnail ?? s.webp ?? s.url),
    [usableSources],
  );
  const mainPlaceholder = useMemo(() => blurhashToDataUrl(src(currentIndex)?.blurhash), [usableSources, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibleThumbs = photos.slice(thumbOffset, thumbOffset + THUMB_PER_PAGE);
  const canScrollLeft = thumbOffset > 0;
  const canScrollRight = thumbOffset + THUMB_PER_PAGE < photos.length;

  const openGallery = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setGalleryStartIndex(index);
    setIsGalleryOpen(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchState.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      dx: 0,
      scrolled: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current) return;
    const dx = e.touches[0].clientX - touchState.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchState.current.y);
    touchState.current.dx = dx;
    if (Math.abs(dx) > TOUCH_SCROLL_THRESHOLD || dy > TOUCH_SCROLL_THRESHOLD) {
      touchState.current.scrolled = true;
    }
  };

  const handleTouchEndOpen = (index: number, e: React.TouchEvent) => {
    const state = touchState.current;
    touchState.current = null;

    if (state && Math.abs(state.dx) >= SWIPE_THRESHOLD) {
      e.stopPropagation();
      e.preventDefault();
      if (state.dx < 0) {
        setCurrentIndex(i => (i + 1) % photos.length);
      } else {
        setCurrentIndex(i => (i - 1 + photos.length) % photos.length);
      }
      return;
    }

    if (state?.scrolled) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    openGallery(index, e);
  };

  const handleThumbTouchEnd = (realIdx: number, e: React.TouchEvent) => {
    if (touchState.current?.scrolled) {
      touchState.current = null;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    touchState.current = null;
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(realIdx);
  };

  return (
    <div className={`${styles.slider} ${className || ''}`}>
      <div
        className={styles.main_wrap}
        onClick={(e) => openGallery(currentIndex, e)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(e) => handleTouchEndOpen(currentIndex, e)}
        style={{ cursor: 'pointer' }}
      >
        <img
          src={mainSrc(currentIndex)}
          // BlurHash рисуется фоном самого <img>: пока файл грузится, виден размытый силуэт,
          // готовое фото просто перекрывает его (без обёртки — раскладка не меняется).
          style={mainPlaceholder ? { backgroundImage: `url(${mainPlaceholder})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
          className={styles.main_photo}
          alt=""
          draggable={false}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        {photos.length > 1 && (
          <>
            <button
              className={styles.arrow_btn}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCurrentIndex(i => (i - 1 + photos.length) % photos.length); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setCurrentIndex(i => (i - 1 + photos.length) % photos.length); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className={styles.arrow_btn}
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCurrentIndex(i => (i + 1) % photos.length); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setCurrentIndex(i => (i + 1) % photos.length); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className={styles.thumbnail_row}>
          {canScrollLeft && (
            <button
              className={`${styles.thumb_arrow} ${styles.thumb_arrow_left}`}
              onClick={(e) => { e.stopPropagation(); setThumbOffset(o => Math.max(0, o - THUMB_PER_PAGE)); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setThumbOffset(o => Math.max(0, o - THUMB_PER_PAGE)); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <div className={styles.thumbnail_strip}>
            {visibleThumbs.map((photo, idx) => {
              const realIdx = thumbOffset + idx;
              return (
                <img
                  key={realIdx}
                  src={src(realIdx)?.thumbnail ?? photo}
                  className={`${styles.thumbnail} ${realIdx === currentIndex ? styles.thumbnail_active : ''}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(realIdx); }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleThumbTouchEnd(realIdx, e)}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                />
              );
            })}
          </div>
          {canScrollRight && (
            <button
              className={`${styles.thumb_arrow} ${styles.thumb_arrow_right}`}
              onClick={(e) => { e.stopPropagation(); setThumbOffset(o => Math.min(photos.length - THUMB_PER_PAGE, o + THUMB_PER_PAGE)); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setThumbOffset(o => Math.min(photos.length - THUMB_PER_PAGE, o + THUMB_PER_PAGE)); }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      )}

      <Preview
        isOpen={isGalleryOpen}
        images={galleryImages}
        thumbnails={galleryThumbnails}
        previews={galleryPreviews}
        originals={usableSources ? photos : undefined}
        currentIndex={galleryStartIndex}
        onClose={() => setIsGalleryOpen(false)}
        onNext={() => setGalleryStartIndex(i => (i + 1) % photos.length)}
        onPrevious={() => setGalleryStartIndex(i => (i - 1 + photos.length) % photos.length)}
        onSelectImage={(index) => setGalleryStartIndex(index)}
      />
    </div>
  );
}
