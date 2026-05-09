import { useRef, useState } from 'react';
import styles from './Carousel.module.scss';
import { Preview } from '../Preview';

const THUMB_PER_PAGE = 4;
const TOUCH_SCROLL_THRESHOLD = 10;

interface PhotoCarouselProps {
  photos: string[];
  className?: string;
}

export function Carousel({ photos, className }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [thumbOffset, setThumbOffset] = useState(0);
  const touchState = useRef<{ x: number; y: number; scrolled: boolean } | null>(null);

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
      scrolled: false,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current) return;
    const dx = Math.abs(e.touches[0].clientX - touchState.current.x);
    const dy = Math.abs(e.touches[0].clientY - touchState.current.y);
    if (dx > TOUCH_SCROLL_THRESHOLD || dy > TOUCH_SCROLL_THRESHOLD) {
      touchState.current.scrolled = true;
    }
  };

  const handleTouchEndOpen = (index: number, e: React.TouchEvent) => {
    if (touchState.current?.scrolled) {
      touchState.current = null;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    touchState.current = null;
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
          src={photos[currentIndex]}
          className={styles.main_photo}
          alt=""
          draggable={false}
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
                  src={photo}
                  className={`${styles.thumbnail} ${realIdx === currentIndex ? styles.thumbnail_active : ''}`}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(realIdx); }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleThumbTouchEnd(realIdx, e)}
                  alt=""
                  draggable={false}
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
        images={photos}
        currentIndex={galleryStartIndex}
        onClose={() => setIsGalleryOpen(false)}
        onNext={() => setGalleryStartIndex(i => (i + 1) % photos.length)}
        onPrevious={() => setGalleryStartIndex(i => (i - 1 + photos.length) % photos.length)}
        onSelectImage={(index) => setGalleryStartIndex(index)}
      />
    </div>
  );
}
