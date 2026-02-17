import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../routers/routes';
import Header from "../../widgets/Header/Header.tsx";
import { Footer } from "../../widgets/Footer";
import AuthModal from "../../features/auth/AuthModal.tsx";
import { setupTokenRefresh, isAuthenticated } from '../../utils/auth';

export default function Layout() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    console.log('Layout location:', location.pathname);
    const isOAuthPage = location.pathname === '/auth/google';

    // Инициализация автоматического обновления токена
    useEffect(() => {
        if (isAuthenticated()) {
            setupTokenRefresh(() => {
                console.log('Token expired, redirecting to home...');
                navigate(ROUTES.HOME);
                window.location.reload();
            });
        }
    }, [navigate]);

    if (isOAuthPage) {
        return <Outlet />;
    }

    const openAuthModal = () => {
        setIsAuthModalOpen(true);
    };

    const closeAuthModal = () => {
        setIsAuthModalOpen(false);
    };

    const handleLoginSuccess = (_token: string, email?: string) => {
        console.log('Login successful:', email);
        closeAuthModal();
    };

    return (
        <div className="app">
            <Header onOpenAuthModal={openAuthModal} />
            <main>
                <Outlet />
            </main>
            <Footer />
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}