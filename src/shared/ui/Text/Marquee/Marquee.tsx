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
    const measureRef = useRef<HTMLSpanElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const check = () => {
            if (containerRef.current && measureRef.current) {
                setIsOverflowing(measureRef.current.scrollWidth > containerRef.current.clientWidth + threshold);
            }
        };

        check();

        const ro = new ResizeObserver(check);
        if (containerRef.current) ro.observe(containerRef.current);
        // measureRef is position:fixed — its size only changes when text/font props change,
        // which is covered by this effect's dependency array.

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
            {/* Hidden single-copy span used only for width measurement */}
            <span ref={measureRef} className={styles.measure} aria-hidden="true">{text}</span>
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
