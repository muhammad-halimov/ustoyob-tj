import React from 'react';
import styles from './Add.module.scss';
import { getAuthToken, getUserRole } from "../../../../../utils/authUtils";
import { useTranslation } from 'react-i18next';

interface AdBtnProps {
    alwaysVisible?: boolean;
    onClick?: () => void;
    text?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const Add = ({onClick, text, icon, className}: AdBtnProps) => {
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
            className={className ? `${styles.btn} ${className}` : styles.btn}
            onClick={onClick}
            aria-label={getButtonText()}
            title={getButtonText()}
        >
            {getButtonText()}{icon && <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>{icon}</span>}
        </button>
    );
}