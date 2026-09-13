import type { ReactNode } from 'react';
import styles from './InfoBanner.module.scss';

interface InfoBannerProps {
    icon?: ReactNode;
    message: ReactNode;
    /** Both must be set for the button to render — an action without a handler is a bug, not a valid state. */
    buttonLabel?: string;
    onButtonClick?: () => void;
    className?: string;
}

/**
 * Inline informational plate — icon + message, with an optional call-to-action button.
 * Generic visual base for one-line notices: `AuthBanner`'s "sign in to see this" wraps it
 * with a button, but plenty of notices (e.g. a role-based restriction) are message-only.
 */
export function InfoBanner({ icon, message, buttonLabel, onButtonClick, className }: InfoBannerProps) {
    return (
        <div className={`${styles.banner} ${className ?? ''}`}>
            {icon}
            <p>{message}</p>
            {buttonLabel && onButtonClick && (
                <button type="button" onClick={onButtonClick}>{buttonLabel}</button>
            )}
        </div>
    );
}
