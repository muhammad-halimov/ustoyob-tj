import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { clearNativeAppCaches } from '../../utils/nativeRefresh';
import { skipNativeSnapshotOnNextLoad } from '../../utils/nativeSnapshot';

const REFRESH_THRESHOLD = 86;
const PROGRESS_FULL_DISTANCE = 150;
const MAX_INDICATOR_TRAVEL = 94;
const INDICATOR_FADE_DISTANCE = 24;
const MIN_SPINNER_TIME = 300;
const SPINNER_HIDE_TIME = 180;

interface NativePullToRefreshProps {
    disabled?: boolean;
}

export function NativePullToRefresh({ disabled = false }: NativePullToRefreshProps) {
    const indicatorRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<SVGCircleElement>(null);
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform() || disabled) return;

        let startX = 0;
        let startY = 0;
        let lastDeltaY = 0;
        let pulling = false;
        let indicatorVisible = false;
        let refreshing = false;

        const setPosition = (distance: number, progress: number) => {
            const indicator = indicatorRef.current;
            if (!indicator) return;
            indicator.style.setProperty('--pull-distance', `${distance}px`);
            indicator.style.setProperty('--pull-opacity', String(Math.min(1, distance / INDICATOR_FADE_DISTANCE)));
            progressRef.current?.setAttribute('stroke-dashoffset', String(56.55 * (1 - progress)));
        };

        const resetPull = () => {
            pulling = false;
            lastDeltaY = 0;
            indicatorVisible = false;
            setIsPulling(false);
            setPosition(0, 0);
        };

        const canStartPull = (target: EventTarget | null): boolean => {
            if (!(target instanceof Element)) return false;
            if (target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [aria-modal="true"]')) return false;

            let node: Element | null = target;
            while (node && node !== document.body && node !== document.documentElement) {
                const style = window.getComputedStyle(node);
                const scrollable = /(auto|scroll|overlay)/.test(style.overflowY)
                    && node.scrollHeight > node.clientHeight + 1;
                if (scrollable && node.scrollTop > 1) return false;
                node = node.parentElement;
            }

            return window.scrollY <= 1;
        };

        const onTouchStart = (event: TouchEvent) => {
            if (refreshing || event.touches.length !== 1 || !canStartPull(event.target)) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            lastDeltaY = 0;
            pulling = true;
            indicatorVisible = false;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!pulling || refreshing) return;
            if (event.touches.length !== 1) return;

            const touch = event.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            if (!indicatorVisible && Math.abs(deltaX) > Math.abs(deltaY) * 1.15 + 8) {
                resetPull();
                return;
            }
            if (!indicatorVisible && deltaY < 4) return;

            event.preventDefault();
            if (!indicatorVisible) {
                indicatorVisible = true;
                setIsPulling(true);
            }
            lastDeltaY = Math.max(0, deltaY);

            const pullDistance = Math.max(0, deltaY);
            const distance = Math.min(
                MAX_INDICATOR_TRAVEL,
                pullDistance <= REFRESH_THRESHOLD
                    ? pullDistance * 0.55
                    : REFRESH_THRESHOLD * 0.55 + (pullDistance - REFRESH_THRESHOLD) * 0.18,
            );
            const progress = Math.min(1, pullDistance / PROGRESS_FULL_DISTANCE);
            setPosition(distance, progress);
        };

        const refresh = async () => {
            const startedAt = performance.now();
            refreshing = true;
            pulling = false;
            setIsPulling(false);
            setIsRefreshing(true);
            setPosition(64, 0.25);
            try {
                await clearNativeAppCaches();
            } catch {
                // Still restart the native app if a storage cache could not be cleared.
            }

            const remainingSpinnerTime = MIN_SPINNER_TIME - (performance.now() - startedAt);
            if (remainingSpinnerTime > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingSpinnerTime));
            }

            setIsRefreshing(false);
            setPosition(0, 0);
            await new Promise(resolve => setTimeout(resolve, SPINNER_HIDE_TIME));
            skipNativeSnapshotOnNextLoad();
            window.location.reload();
        };

        const onTouchEnd = (event: TouchEvent) => {
            if (!pulling || event.touches.length > 0) return;
            const releasedTouch = event.changedTouches[0];
            const releaseDeltaY = releasedTouch
                ? Math.max(0, releasedTouch.clientY - startY)
                : lastDeltaY;
            const shouldRefresh = releaseDeltaY >= REFRESH_THRESHOLD;
            pulling = false;
            if (shouldRefresh) void refresh();
            else resetPull();
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
        document.addEventListener('touchcancel', resetPull, { passive: true });

        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
            document.removeEventListener('touchcancel', resetPull);
            setIsPulling(false);
            setPosition(0, 0);
        };
    }, [disabled]);

    if (!Capacitor.isNativePlatform()) return null;

    return (
        <div
            ref={indicatorRef}
            className={`native-pull-refresh${isPulling ? ' native-pull-refresh--pulling' : ''}${isRefreshing ? ' native-pull-refresh--refreshing' : ''}`}
            role="status"
            aria-label={isRefreshing ? 'Обновление приложения' : 'Потяните вниз для обновления'}
            aria-hidden={!isPulling && !isRefreshing}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle className="native-pull-refresh__track" cx="12" cy="12" r="9" />
                <circle ref={progressRef} className="native-pull-refresh__progress" cx="12" cy="12" r="9" />
            </svg>
        </div>
    );
}
