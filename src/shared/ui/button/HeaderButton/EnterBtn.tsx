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
    const navigate = useNavigate();
    const { t } = useTranslation(['header', 'common']);

    const modalOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen;

    useEffect(() => {
        const checkAuth = () => {
            const token = getAuthToken();
            setIsLoggedIn(!!token);
        };

        checkAuth();

        const handleStorageChange = () => checkAuth();
        const handleLogout = () => setIsLoggedIn(false);

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('logout', handleLogout);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('logout', handleLogout);
        };
    }, []);

    const handleLoginSuccess = (token: string) => {
        console.log('User logged in with token:', token);
        setIsLoggedIn(true);
        closeModal();

        if (onLoginSuccess) {
            onLoginSuccess();
        }

        window.dispatchEvent(new Event('storage'));
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
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('logout'));
            navigate('/');
            window.location.reload();
        } catch (error) {
            console.error('Logout error:', error);
            // В случае ошибки все равно очищаем и перенаправляем
            setIsLoggedIn(false);
            window.dispatchEvent(new Event('storage'));
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
            return t('header:logout');
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