import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNetwork } from '../../contexts';
import { EmptyState } from '../EmptyState';
import styles from './OfflineGate.module.scss';

/** Feather-style "wifi-off" glyph — matches EmptyState's default icon (currentColor, stroke-based). */
const WifiOffIcon = (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 1l22 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10.71 5.05A16 16 0 0 1 22.58 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="20" r="1" fill="currentColor"/>
    </svg>
);

/**
 * Full-screen "no internet connection" overlay, shown on top of the whole app
 * (header/footer included) whenever NetworkContext reports the device is offline.
 * The app tree stays mounted underneath — as soon as connectivity returns, the
 * overlay just disappears instead of losing route/scroll state.
 */
function NoInternet() {
    const { t } = useTranslation('common');
    const { checkNow } = useNetwork();
    const [isChecking, setIsChecking] = useState(false);

    const handleRetry = async () => {
        setIsChecking(true);
        try {
            await checkNow();
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <EmptyState
                icon={WifiOffIcon}
                title={t('offline.title', 'Нет подключения к интернету')}
                subtitle={t('offline.subtitle', 'Проверьте Wi-Fi или мобильный интернет и попробуйте снова.')}
                actionText={t('offline.retry', 'Повторить')}
                onAction={handleRetry}
                isLoading={isChecking}
            />
        </div>
    );
}

/** Wraps the app tree, overlaying {@link NoInternet} whenever the device goes offline. */
export function OfflineGate({ children }: { children: ReactNode }) {
    const { isOnline } = useNetwork();

    return (
        <>
            {children}
            {!isOnline && <NoInternet />}
        </>
    );
}
