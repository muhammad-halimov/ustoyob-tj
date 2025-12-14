import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAuthToken, logout } from '../../../../utils/auth.ts';
import AuthModal from "../../../../features/auth/AuthModal.tsx";
import styles from './EnterBtn.module.scss';

type EnterBtnProps = {
    onClick?: () => void;
    isModalOpen?: boolean;
    onModalClose?: () => void;
    onLoginSuccess?: () => void;
};

export function EnterBtn({ onClick, isModalOpen, onModalClose, onLoginSuccess }: EnterBtnProps) {
    const [internalModalOpen, setInternalModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userName, setUserName] = useState<string>('');
    const navigate = useNavigate();
    const { t } = useTranslation(['header', 'common']);

    const modalOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen;

    // Функция для проверки статуса пользователя
    const checkUserStatus = async () => {
        const token = getAuthToken();
        const loggedIn = !!token;
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
            try {
                // Получаем данные пользователя для отображения имени
                const userDataStr = localStorage.getItem('userData');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    if (userData.name) {
                        setUserName(userData.name);
                    }
                }
            } catch (error) {
                console.error('Error parsing user data:', error);
            }
        } else {
            setUserName('');
        }
    };

    useEffect(() => {
        checkUserStatus();

        const handleAuthChange = () => {
            checkUserStatus();
        };

        // Слушаем события авторизации
        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('login', handleAuthChange);
        window.addEventListener('logout', handleAuthChange);

        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('login', handleAuthChange);
            window.removeEventListener('logout', handleAuthChange);
        };
    }, []);

    const handleLoginSuccess = (token: string) => {
        console.log('User logged in with token:', token);
        setIsLoggedIn(true);
        closeModal();

        // Обновляем данные пользователя
        setTimeout(() => {
            checkUserStatus();
        }, 500);

        if (onLoginSuccess) {
            onLoginSuccess();
        }

        window.dispatchEvent(new Event('login'));
    };

    const handleButtonClick = async () => {
        onClick?.();

        if (isLoggedIn) {
            await handleLogout();
        } else if (isModalOpen === undefined) {
            setInternalModalOpen(true);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            setIsLoggedIn(false);
            setUserName('');
            window.dispatchEvent(new Event('logout'));
            navigate('/');
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            setIsLoggedIn(false);
            setUserName('');
            window.dispatchEvent(new Event('logout'));
            navigate('/');
            window.location.reload();
        }
    };

    const closeModal = () => {
        if (isModalOpen === undefined) {
            setInternalModalOpen(false);
        } else {
            onModalClose?.();
        }
    };

    const getButtonText = () => {
        if (isLoggedIn) {
            return userName ? `${t('header:logout')} (${userName})` : t('header:logout');
        }
        return t('header:login');
    };

    return (
        <>
            <button
                className={`${styles.btn} ${isLoggedIn ? styles.logoutBtn : ''}`}
                onClick={handleButtonClick}
                aria-label={getButtonText()}
                title={getButtonText()}
            >
                {getButtonText()}
            </button>

            {!isLoggedIn && (
                <AuthModal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    onLoginSuccess={handleLoginSuccess}
                />
            )}
        </>
    );
}