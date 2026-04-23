import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { ROUTES } from '../routers/routes';
import Header from "../../shared/ui/Header/Header.tsx";
import { Footer } from "../../shared/ui/Footer";
import Auth from "../../shared/ui/Modal/Auth/Auth.tsx";
import { setupTokenRefresh, isAuthenticated } from '../../utils/auth';

export default function Layout() {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const navType = useNavigationType(); // 'POP' = back/forward, 'PUSH'/'REPLACE' = new

    // Непрерывно сохраняем скролл по ключу текущего history entry
    useEffect(() => {
        const key = `scroll:${location.key}`;
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(() => {
                    try { sessionStorage.setItem(key, String(window.scrollY)); } catch { /* ignore */ }
                    ticking = false;
                });
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [location.key]);

    // При смене маршрута: POP → восстановить скролл, PUSH/REPLACE → сброс вверх
    useEffect(() => {
        if (navType === 'POP') {
            const saved = (() => { try { return sessionStorage.getItem(`scroll:${location.key}`); } catch { return null; } })();
            if (saved !== null) {
                const target = Number(saved);
                // Пробуем восстановить несколько раз — контент подгружается асинхронно
                let attempts = 0;
                const tryRestore = () => {
                    window.scrollTo({ top: target, behavior: 'instant' });
                    attempts++;
                    if (Math.abs(window.scrollY - target) > 50 && attempts < 10) {
                        setTimeout(tryRestore, 100);
                    }
                };
                requestAnimationFrame(tryRestore);
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
        }
    }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Глобальное открытие Auth через custom event
    useEffect(() => {
        const handler = () => setIsAuthModalOpen(true);
        window.addEventListener('openAuthModal', handler);
        return () => window.removeEventListener('openAuthModal', handler);
    }, []);

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
            <Auth
                isOpen={isAuthModalOpen}
                onClose={closeAuthModal}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}