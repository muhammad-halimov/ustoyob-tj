import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import Status from '../../shared/ui/Modal/Status';
import { useTheme } from '../../contexts';
import { useTranslation } from 'react-i18next';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserRole,
    setUserData,
    setUserEmail,
    setUserOccupation
} from '../../utils/auth';

interface LinkEmailResponse {
    user?: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        occupation?: Array<{ id: number; title: string; [key: string]: unknown }>;
        [key: string]: unknown;
    };
    token?: string;
    error?: string;
}

const TelegramLinkEmailPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useTranslation('common');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const tempToken = sessionStorage.getItem('telegramTempToken');
        if (!tempToken) {
            navigate(ROUTES.HOME, { replace: true });
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const tempToken = sessionStorage.getItem('telegramTempToken');
        if (!tempToken) {
            navigate(ROUTES.HOME, { replace: true });
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/telegram/link-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ temp_token: tempToken, email }),
            });

            const data: LinkEmailResponse = await response.json();

            if (data.error === 'invalid_token') {
                sessionStorage.removeItem('telegramTempToken');
                sessionStorage.removeItem('pendingTelegramRole');
                sessionStorage.removeItem('pendingTelegramSpecialty');
                navigate(ROUTES.HOME, { replace: true });
                return;
            }

            if (data.error === 'email_taken') {
                setError(t('oauth.emailTaken'));
                setLoading(false);
                return;
            }

            if (data.token && data.user) {
                setAuthToken(data.token);

                const expiryTime = new Date();
                expiryTime.setHours(expiryTime.getHours() + 1);
                setAuthTokenExpiry(expiryTime.toISOString());

                setUserData(data.user);

                if (data.user.email) {
                    setUserEmail(data.user.email);
                }

                const savedRole = sessionStorage.getItem('pendingTelegramRole') || 'client';
                let finalRole = savedRole as 'master' | 'client';
                if (data.user.roles && data.user.roles.length > 0) {
                    const roles = data.user.roles.map(r => r.toLowerCase());
                    if (roles.includes('role_master') || roles.includes('master')) {
                        finalRole = 'master';
                    } else if (roles.includes('role_client') || roles.includes('client')) {
                        finalRole = 'client';
                    }
                }
                setUserRole(finalRole);

                if (data.user.occupation) {
                    setUserOccupation(data.user.occupation);
                }

                sessionStorage.removeItem('telegramTempToken');
                sessionStorage.removeItem('pendingTelegramRole');
                sessionStorage.removeItem('pendingTelegramSpecialty');

                window.dispatchEvent(new Event('login'));
                navigate(ROUTES.HOME, { replace: true });
            } else {
                throw new Error(t('oauth.tokenNotReceived'));
            }
        } catch (err) {
            console.error('TelegramLinkEmail error:', err);
            setError(err instanceof Error ? err.message : t('oauth.tryLater'));
            setLoading(false);
        }
    };

    const handleSkip = () => {
        sessionStorage.removeItem('telegramTempToken');
        sessionStorage.removeItem('pendingTelegramRole');
        sessionStorage.removeItem('pendingTelegramSpecialty');
        navigate(ROUTES.HOME, { replace: true });
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            padding: '20px',
            backgroundColor: isDark ? '#1A1A1A' : '#f5f5f5',
        }}>
            <div style={{
                backgroundColor: isDark ? '#2A2A2A' : '#ffffff',
                borderRadius: '12px',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.1)',
            }}>
                <h2 style={{ marginBottom: '8px', color: isDark ? '#E5E5E5' : '#333', textAlign: 'center' }}>
                    {t('oauth.linkEmailTitle')}
                </h2>
                <p style={{ marginBottom: '24px', color: isDark ? '#A8A8A8' : '#666', textAlign: 'center', fontSize: '14px' }}>
                    {t('oauth.linkEmailDescription')}
                </p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder={t('oauth.emailPlaceholder')}
                        required
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${isDark ? '#404040' : '#ddd'}`,
                            backgroundColor: isDark ? '#1A1A1A' : '#f9f9f9',
                            color: isDark ? '#E5E5E5' : '#333',
                            fontSize: '16px',
                            marginBottom: '16px',
                            boxSizing: 'border-box',
                            outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !email}
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: loading || !email ? (isDark ? '#404040' : '#ccc') : '#0088cc',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: loading || !email ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s',
                        }}
                    >
                        {loading ? t('oauth.pleaseWait') : t('oauth.linkEmailSubmit')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            marginTop: '10px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: isDark ? '#A8A8A8' : '#888',
                            fontSize: '14px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {t('oauth.linkEmailSkip')}
                    </button>
                </form>
            </div>
            <Status
                type="error"
                isOpen={!!error}
                onClose={() => setError('')}
                message={error}
            />
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default TelegramLinkEmailPage;
