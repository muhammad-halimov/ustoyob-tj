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

            // Measure true text width by appending a temp span directly to document.body.
            // This is immune to any ancestor overflow:hidden, transform, will-change, or filter
            // that would otherwise clamp scrollWidth when using position:fixed/absolute inside the tree.
            const cs = window.getComputedStyle(container);
            const tmp = document.createElement('span');
            tmp.style.cssText = [
                'position:fixed',
                'top:-9999px',
                'left:-9999px',
                'visibility:hidden',
                'white-space:nowrap',
                'pointer-events:none',
                `font-size:${cs.fontSize}`,
                `font-weight:${cs.fontWeight}`,
                `font-family:${cs.fontFamily}`,
                `letter-spacing:${cs.letterSpacing}`,
                `font-style:${cs.fontStyle}`,
            ].join(';');
            tmp.textContent = text;
            document.body.appendChild(tmp);
            const measuredWidth = tmp.scrollWidth;
            document.body.removeChild(tmp);

            // Gap must match paddingRight on the inner spans (3em → integer px).
            const gapPx = Math.round(3 * parseFloat(cs.fontSize));
            setCopyOffsetPx(measuredWidth + gapPx);
            setTextWidth(measuredWidth);
            setIsOverflowing(measuredWidth > container.clientWidth + threshold);
        };

        check();

        const ro = new ResizeObserver(check);
        if (containerRef.current) ro.observe(containerRef.current);
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
