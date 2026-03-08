import { useTranslation } from 'react-i18next';
import styles from './EmptyState.module.scss';

interface EmptyStateProps {
    title?: string;
    subtitle?: string;
    actionText?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({ title, subtitle, actionText, onAction, className }: EmptyStateProps) {
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
        </div>
    );
}
