import styles from './EnterBtn.module.scss';
import { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import AuthModal from "../../../../features/auth/AuthModal.tsx";
import { removeAuthToken } from '../../../../utils/auth';

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

    const modalOpen = isModalOpen !== undefined ? isModalOpen : internalModalOpen;

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('authToken');
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

    const handleButtonClick = () => {
        onClick?.();

        if (isLoggedIn) {
            handleLogout();
        } else if (isModalOpen === undefined) {
            setInternalModalOpen(true);
        }
    };

    const handleLogout = () => {
        removeAuthToken();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userData');
        localStorage.removeItem('userEmail');

        setIsLoggedIn(false);
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('logout'));
        navigate('/');
    };

    const closeModal = () => {
        if (isModalOpen === undefined) {
            setInternalModalOpen(false);
        } else {
            onModalClose?.();
        }
    };

    return (
        <>
            <button
                className={styles.btn}
                onClick={handleButtonClick}
            >
                {isLoggedIn ? 'Выйти' : 'Войти'}
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
