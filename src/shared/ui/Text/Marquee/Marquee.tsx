import { useRef, useEffect, useState } from 'react';
import type * as React from 'react';
import styles from './Marquee.module.scss';

interface MarqueeTextProps {
    text: string;
    className?: string;
    /** Duration in seconds for one full scroll cycle. If omitted, duration is auto-computed from text width at ~60px/s. */
    duration?: number;
    /** If true the animation plays continuously; if false it plays only on hover. Default: false */
    alwaysScroll?: boolean;
    /** Pixels of overflow needed to trigger scrolling. Lower = activates sooner. Default: 1 */
    threshold?: number;
}

/** Scroll speed in px/s used when duration is not explicitly provided. */
const SCROLL_SPEED = 30;

/**
 * Renders text that scrolls horizontally when it overflows its container.
 * Overflow is detected via a ResizeObserver so it reacts to layout changes.
 */
export function Marquee({ text, className, duration, alwaysScroll = false, threshold = 1 }: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const [textWidth, setTextWidth] = useState(0);
    // Exact pixel offset for one copy (text + gap). Integer px eliminates sub-pixel drift at loop seam.
    const [copyOffsetPx, setCopyOffsetPx] = useState(0);

    useEffect(() => {
        const check = () => {
            const container = containerRef.current;
            if (!container) return;

            // Ширина текста — из его же собственной первой копии, уже отрисованной тем же шрифтом и
            // теми же правилами вёрстки, что и контейнер. Раньше мерили отдельным временным span'ом
            // в <body>: у него метрики могли расходиться с реальной раскладкой на пару пикселей
            // (реальные Android-телефоны, шрифт ещё догружается), и тогда в контейнере с шириной
            // «по содержимому» (title карточки на мобилке) получался цикл: текст «не влезает» →
            // включается вторая копия → контейнер раздувается → «влезает» → копия пропадает → ...
            // — название мигало и «прыгало». Копия — inline-block с nowrap, её ширина — это ширина
            // текста, обрезка контейнером (overflow:hidden) на неё не влияет.
            const cs = window.getComputedStyle(container);
            const first = textRef.current?.firstElementChild as HTMLElement | null;
            if (!first) return;
            const rawWidth = first.getBoundingClientRect().width - parseFloat(window.getComputedStyle(first).paddingRight || '0');
            const measuredWidth = Math.ceil(rawWidth);

            // Gap must match paddingRight on the inner spans (3em → integer px).
            const gapPx = Math.round(3 * parseFloat(cs.fontSize));
            setCopyOffsetPx(measuredWidth + gapPx);
            setTextWidth(measuredWidth);
            setIsOverflowing(rawWidth > container.clientWidth + threshold);
        };

        check();

        const ro = new ResizeObserver(check);
        if (containerRef.current) ro.observe(containerRef.current);
        // Веб-шрифт мог догрузиться уже после первого замера — ширина текста поменялась, а
        // размер контейнера (фиксированный) — нет, ResizeObserver не сработает.
        void document.fonts?.ready.then(check);
        return () => ro.disconnect();
    }, [text, threshold]);

    const effectiveDuration = duration ?? Math.max(10, textWidth / SCROLL_SPEED);

    const animationStyle = isOverflowing
        ? {
            '--marquee-duration': `${effectiveDuration}s`,
            '--marquee-offset': `-${copyOffsetPx}px`,
          } as React.CSSProperties
        : undefined;

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${className ?? ''}`}
            title={text}
        >
            <span
                ref={textRef}
                className={`${styles.text} ${isOverflowing ? (alwaysScroll ? styles.scrolling : styles.hoverScrolling) : ''}`}
                style={animationStyle}
            >
                {/* Two equal-width copies so translateX(-50%) lands exactly on seam */}
                <span style={{ display: 'inline-block', ...(isOverflowing && { paddingRight: '3em' }) }}>{text}</span>
                {isOverflowing && <span aria-hidden style={{ display: 'inline-block', paddingRight: '3em' }}>{text}</span>}
            </span>
        </div>
    );
}
