import { useState } from 'react';
import styles from './Carousel.module.scss';
import { Preview } from '../Preview';

const THUMB_PER_PAGE = 4;

interface PhotoCarouselProps {
  photos: string[];
  className?: string;
}

export function Carousel({ photos, className }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [thumbOffset, setThumbOffset] = useState(0);

  const visibleThumbs = photos.slice(thumbOffset, thumbOffset + THUMB_PER_PAGE);
  const canScrollLeft = thumbOffset > 0;
  const canScrollRight = thumbOffset + THUMB_PER_PAGE < photos.length;

  const openGallery = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setGalleryStartIndex(index);
    setIsGalleryOpen(true);
  };

  return (
    <div className={`${styles.slider} ${className || ''}`}>
      <div
        className={styles.main_wrap}
        onClick={(e) => openGallery(currentIndex, e)}
        onTouchEnd={(e) => openGallery(currentIndex, e)}
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
                  onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setCurrentIndex(realIdx); }}
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
