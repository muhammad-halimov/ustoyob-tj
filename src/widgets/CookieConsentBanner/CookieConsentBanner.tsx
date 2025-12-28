import React, { useState, useEffect } from 'react';
import styles from './CookieConsentBanner.module.scss';

const CookieConsentBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isCookieConsentGiven = localStorage.getItem('cookieConsent');

        if (!isCookieConsentGiven) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setIsVisible(false);
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
                    <h3 className={styles.cookieTitle}>🍪 Мы используем cookies</h3>
                    <p className={styles.cookieDescription}>
                        Мы используем Cookies для функционирования сайта.
                        Нажимая "Принять" вы соглашаетесь с использованием Cookies!
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
                        Принять
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;