import styles from './AdBtn.module.scss';
import { getAuthToken } from "../../../../utils/auth";
import { useTranslation } from 'react-i18next';

interface AdBtnProps {
    alwaysVisible?: boolean;
    onClick?: () => void;
    text?: string;
}

export const AdBtn = ({
                          onClick,
                          text
                      }: AdBtnProps) => {
    const { t } = useTranslation(['header', 'common']);
    const isAuthenticated = !!getAuthToken();

    // Получаем роль пользователя из localStorage
    const getUserRole = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('userRole');
    };

    const userRole = getUserRole();

    // Получаем текст кнопки с учетом языка
    const getButtonText = () => {
        if (text) return text;

        return userRole === 'ROLE_MASTER' && isAuthenticated
            ? t('header:postAd', 'Post a ticket')
            : t('header:postService', 'Post a service');
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