import { useTranslation } from 'react-i18next';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
    title?: string;
    subtitle?: string;
    actionText?: string;
    onAction?: () => void;
    onRefresh?: () => void;
    className?: string;
}

export function EmptyState({ title, subtitle, actionText, onAction, onRefresh, className }: EmptyStateProps) {
    const { t } = useTranslation(['common']);

    return (
        <div className={`${styles.container} ${className || ''}`}>
            <div className={styles.icon}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="20" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
                    <path d="M8 28H56" stroke="currentColor" strokeWidth="3"/>
                    <path d="M22 8L16 20M42 8L48 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    <circle cx="32" cy="42" r="7" stroke="currentColor" strokeWidth="3"/>
                    <path d="M29 42H35M32 39V45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
            </div>
            <p className={styles.title}>
                {title ?? t('common:emptyState.title')}
            </p>
            {subtitle && (
                <p className={styles.subtitle}>{subtitle}</p>
            )}
            {onAction && (
                <button className={styles.action} onClick={onAction}>
                    {actionText ?? t('common:emptyState.refresh')}
                </button>
            )}
            {onRefresh && (
                <button className={styles.refresh} onClick={onRefresh}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.51 15C4.15839 16.8404 5.38734 18.4202 7.01166 19.5014C8.63598 20.5826 10.5677 21.1066 12.5157 20.9945C14.4637 20.8824 16.3226 20.1402 17.8121 18.8798C19.3017 17.6193 20.3413 15.909 20.7742 14.0064C21.2072 12.1037 21.0101 10.112 20.2126 8.33111C19.4152 6.55025 18.0605 5.07686 16.3528 4.13077C14.6451 3.18469 12.6769 2.81662 10.7447 3.08098C8.81245 3.34534 7.02091 4.22637 5.64 5.59L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('common:emptyState.refresh')}
                </button>
            )}
        </div>
    );
}
