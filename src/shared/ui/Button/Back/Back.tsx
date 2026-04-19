import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Back.module.scss';

interface BackButtonProps {
    /** Additional className for the wrapper div */
    className?: string;
    /** Where to go when there is no browser history. Defaults to '/' */
    fallbackPath?: string;
}

export function Back({ className, fallbackPath = '/' }: BackButtonProps) {
    const navigate = useNavigate();
    const { t } = useTranslation(['components']);

    const handleBack = () => {
        // If the user has history to go back to, use it.
        // window.history.length === 1 means the page was opened directly (new tab, typed URL, etc.)
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(fallbackPath);
        }
    };

    return (
        <div className={`${styles.back_section} ${className ?? ''}`}>
            <button className={styles.backBtn} onClick={handleBack}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.text}>{t('components:app.back')}</span>
            </button>
        </div>
    );
}
