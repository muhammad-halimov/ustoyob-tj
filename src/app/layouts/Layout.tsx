import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from "../../widgets/Header/Header.tsx";
import AuthModal from "../../features/auth/AuthModal.tsx";

export default function Layout() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const location = useLocation();

    console.log('Layout location:', location.pathname);
    const isOAuthPage = location.pathname === '/auth/google';

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
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}