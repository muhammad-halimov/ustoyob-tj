import styles from './AdBtn.module.scss';
import { getAuthToken } from "../../../../utils/auth";
import { useTranslation } from 'react-i18next';

interface AdBtnProps {
    alwaysVisible?: boolean;
    onClick?: () => void;
}

export const AdBtn = ({
                          alwaysVisible = false,
                          onClick
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
        return t('header:postAd', 'Post ad');
    };

    if (!alwaysVisible && isAuthenticated && userRole === 'ROLE_MASTER') {
        return null;
    }

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