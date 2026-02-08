import { useEffect, useState, useRef } from "react";
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
    const isLoggingOutRef = useRef(false);
    const navigate = useNavigate();
    const { t } = useTranslation(['header', 'common']);

    const modalOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen;

    useEffect(() => {
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

        checkUserStatus();

        const handleAuthChange = () => {
            if (!isLoggingOutRef.current) {
                checkUserStatus();
            }
        };

        // Слушаем события авторизации
        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('login', handleAuthChange);
        window.addEventListener('logout', handleAuthChange);
        window.addEventListener('roleSelected', handleAuthChange); // Добавьте это

        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('login', handleAuthChange);
            window.removeEventListener('logout', handleAuthChange);
            window.removeEventListener('roleSelected', handleAuthChange); // И это
        };
    }, []);

    const handleLoginSuccess = (token: string) => {
        console.log('User logged in with token:', token);
        setIsLoggedIn(true);
        closeModal();

        if (onLoginSuccess) {
            onLoginSuccess();
        }

        window.dispatchEvent(new Event('login'));
        
        // Перезагружаем страницу после авторизации
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const handleButtonClick = async () => {
        if (isLoggedIn) {
            const confirmed = confirm(t('header:logoutConfirm', 'Вы уверены, что хотите выйти?'));
            if (confirmed) {
                await handleLogout();
            }
        } else {
            onClick?.();
            if (isModalOpen === undefined) {
                setInternalModalOpen(true);
            }
        }
    };

    const handleLogout = async () => {
        isLoggingOutRef.current = true;
        try {
            await logout();
            navigate('/');
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
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
            return userName ? `${t('header:logout')}` : t('header:logout');
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