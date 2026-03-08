import { useRef, useEffect, useState } from 'react';
import styles from './Marquee.module.scss';

interface MarqueeTextProps {
    text: string;
    className?: string;
    /** Duration in seconds for one full scroll cycle. Default: 8 */
    duration?: number;
    /** If true the animation plays continuously; if false it plays only on hover. Default: false */
    alwaysScroll?: boolean;
}

/**
 * Renders text that scrolls horizontally when it overflows its container.
 * Overflow is detected via a ResizeObserver so it reacts to layout changes.
 */
export function Marquee({ text, className, duration = 8, alwaysScroll = false }: MarqueeTextProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(() => {
        const check = () => {
            if (containerRef.current && textRef.current) {
                setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth + 1);
            }
        };

        check();

        const ro = new ResizeObserver(check);
        if (containerRef.current) ro.observe(containerRef.current);
        if (textRef.current) ro.observe(textRef.current);

        return () => ro.disconnect();
    }, [text]);

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
