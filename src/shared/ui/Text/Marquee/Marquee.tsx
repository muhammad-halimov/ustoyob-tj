import { useRef, useEffect, useState } from 'react';
import styles from './Marquee.module.scss';

interface MarqueeTextProps {
    text: string;
    className?: string;
    /** Duration in seconds for one full scroll cycle. Default: 8 */
    duration?: number;
    /** If true the animation plays continuously; if false it plays only on hover. Default: false */
    alwaysScroll?: boolean;
    /** Pixels of overflow needed to trigger scrolling. Lower = activates sooner. Default: 1 */
    threshold?: number;
}

/**
 * Renders text that scrolls horizontally when it overflows its container.
 * Overflow is detected via a ResizeObserver so it reacts to layout changes.
 */
export function Marquee({ text, className, duration = 8, alwaysScroll = false, threshold = 1 }: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

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
            const textWidth = tmp.scrollWidth;
            document.body.removeChild(tmp);

            setIsOverflowing(textWidth > container.clientWidth + threshold);
        };

        check();

        const ro = new ResizeObserver(check);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [text, threshold]);

    const animationStyle = isOverflowing
        ? { '--marquee-duration': `${duration}s` } as React.CSSProperties
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
                {text}
                {/* Duplicate so the seam is invisible during the loop */}
                {isOverflowing && <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}</>}
            </span>
        </div>
    );
}
