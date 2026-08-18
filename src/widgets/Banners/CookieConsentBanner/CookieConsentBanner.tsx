import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CookieConsentBanner.module.scss';
import { getStorageItem, setStorageItem } from '../../../utils/storageUtils';
import { getAuthToken, getUserData, setUserData } from '../../../utils/authUtils';
import { universalApiRequest } from '../../../utils/apiUtils';

/**
 * Cookie consent banner.
 * Shown once after a 1-second delay when consent hasn't been recorded yet — for a logged-in
 * user that means the backend's own `User.cookiesAgreed` (§3, the actual source of truth,
 * synced across devices), for a guest it falls back to the local-only flag since there's no
 * user record yet to check. Accepting persists both: the API field (so it stays agreed once
 * they log in anywhere else) and the local flag (so it doesn't flash again in this browser
 * before that request resolves, or if they're logged out).
 */
const CookieConsentBanner: React.FC = () => {
    const { t } = useTranslation(['common']);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const user = getUserData();
        const isCookieConsentGiven = getAuthToken()
            ? !!user?.cookiesAgreed
            : !!getStorageItem('cookieConsent');

        if (!isCookieConsentGiven) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        setStorageItem('cookieConsent', 'accepted');
        setIsVisible(false);

        const user = getUserData();
        if (!getAuthToken() || !user?.id) return;

        universalApiRequest(`/api/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/merge-patch+json' },
            body: { cookiesAgreed: true },
            locale: false,
        })
            .then(() => setUserData({ ...user, cookiesAgreed: true }))
            .catch(() => {
                // Non-critical — the local flag above already keeps the banner from
                // reappearing in this browser; worst case it re-asks on the next login
                // elsewhere, same as before this field existed at all.
            });
    };

    // const handleDecline = () => {
    //     localStorage.setItem('cookieConsent', 'declined');
    //     setIsVisible(false);
    // };

    // const handleLearnMore = () => {
    //     // window.open('/privacy-policy', '_blank');
    // };

    if (!isVisible) return null;

    return (
        <div className={styles.cookieBanner}>
            <div className={styles.cookieContent}>
                <div className={styles.cookieText}>
                    <h3 className={styles.cookieTitle}>{t('common:cookieConsent.title')}</h3>
                    <p className={styles.cookieDescription}>
                        {t('common:cookieConsent.description')}
                        {/*<button*/}
                        {/*    className={styles.learnMoreLink}*/}
                        {/*    onClick={handleLearnMore}*/}
                        {/*>*/}
                        {/*    Политикой конфиденциальности*/}
                        {/*</button>.*/}
                    </p>
                </div>

                <div className={styles.cookieButtons}>
                    {/*<button*/}
                    {/*    className={styles.declineButton}*/}
                    {/*    onClick={handleDecline}*/}
                    {/*>*/}
                    {/*    Отклонить*/}
                    {/*</button>*/}
                    <button
                        className={styles.acceptButton}
                        onClick={handleAccept}
                    >
                        {t('common:cookieConsent.accept')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;