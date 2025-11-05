import styles from './EnterBtn.module.scss';
import {useEffect, useState} from "react";
import AuthModal from "../../../../features/auth/AuthModal.tsx";


export const EnterBtn =    ()=>  {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Проверяем авторизацию при загрузке компонента
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        setIsLoggedIn(!!token);
    }, []);

    const handleLoginSuccess = (token: string) => {
        console.log('User logged in with token:', token);
        setIsLoggedIn(true);
        setIsAuthModalOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        setIsLoggedIn(false);
    };

    // Если пользователь авторизован, показываем кнопку "Выйти"
    if (isLoggedIn) {
        return (
            <button className={styles.btn} onClick={handleLogout}>
                Выйти
            </button>
        );
    }


    return (
        <>
            <button className={styles.btn} onClick={() => setIsAuthModalOpen(true)}>
                Войти
            </button>

            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />
        </>

    );
}