import React from 'react';
import styles from './AdBtn.module.scss';
import { getAuthToken, getUserRole } from "../../../../../utils/auth.ts";
import { useTranslation } from 'react-i18next';

interface AdBtnProps {
    alwaysVisible?: boolean;
    onClick?: () => void;
    text?: string;
    icon?: React.ReactNode;
}

export const AdBtn = ({onClick, text, icon}: AdBtnProps) => {
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
            {getButtonText()}{icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>{icon}</span>}
        </button>
    );
}