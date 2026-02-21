import styles from './AdBtn.module.scss';
import { getAuthToken, getUserRole } from "../../../../utils/auth";
import { useTranslation } from 'react-i18next';

interface AdBtnProps {
    alwaysVisible?: boolean;
    onClick?: () => void;
    text?: string;
}

export const AdBtn = ({onClick, text}: AdBtnProps) => {
    const { t } = useTranslation(['header', 'common']);
    const isAuthenticated = !!getAuthToken();
    const userRole = getUserRole();

    // Получаем текст кнопки с учетом языка
    const getButtonText = () => {
        if (text) return text;

        return userRole === 'master' && isAuthenticated
            ? t('header:postService', 'Post a service')
            : t('header:postAd', 'Post a ticket');
    };

    return (
        <button
            className={styles.btn}
            onClick={onClick}
            aria-label={getButtonText()}
            title={getButtonText()}
        >
            {getButtonText()}
        </button>
    );
}