// GoogleOAuthPage.tsx или GoogleOAuthPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthToken, setAuthTokenExpiry } from '../../utils/auth';
import { ROUTES } from '../../app/routers/routes';
import { useTheme } from '../../contexts';
import { useTranslation } from 'react-i18next';

const GoogleOAuthPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useTranslation('common');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const scope = searchParams.get('scope');

            console.log('GoogleOAuthPage: Processing callback...');
            console.log('Received params:', { code: !!code, state: !!state, error: searchParams.get('error'), scope });

            if (!code || !state) {
                setError(t('oauth.noAuthData'));
                setTimeout(() => navigate(ROUTES.HOME), 3000);
                return;
            }

            try {
                const savedRole = sessionStorage.getItem('pendingGoogleRole') || 'client';
                const savedSpecialty = sessionStorage.getItem('pendingGoogleSpecialty');

                console.log('Using saved role:', savedRole, 'specialty:', savedSpecialty);

                // Подготавливаем запрос с ролью
                const requestData: {
                    code: string;
                    state: string;
                    role: string;
                    occupation?: string;
                } = {
                    code,
                    state,
                    role: savedRole
                };

                if (savedRole === 'master' && savedSpecialty) {
                    requestData.occupation = `${API_BASE_URL}/api/occupations/${savedSpecialty}`;
                }

                console.log('Sending Google callback to server with role:', requestData.role);

                const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Ошибка сервера: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                console.log('Server response data:', data);

                // Сохраняем токен
                if (data.token) {
                    setAuthToken(data.token);

                    // Устанавливаем срок действия токена
                    const expiryTime = new Date();
                    expiryTime.setHours(expiryTime.getHours() + 1);
                    setAuthTokenExpiry(expiryTime.toISOString());

                    console.log('Google auth successful, redirecting to home...');

                    // Очищаем временные данные
                    sessionStorage.removeItem('pendingGoogleRole');
                    sessionStorage.removeItem('pendingGoogleSpecialty');

                    // Редирект на главную
                    navigate(ROUTES.HOME);
                } else {
                    throw new Error(t('oauth.tokenNotReceived'));
                }

            } catch (err) {
                console.error('Google OAuth error:', err);
                setError(err instanceof Error ? err.message : 'Ошибка авторизации');
                setTimeout(() => navigate(ROUTES.HOME), 3000);
            }
        };

        processCallback();
    }, [searchParams, navigate]);

    if (error) {
        return (
            <div style={{
                padding: '20px',
                textAlign: 'center',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark ? '#1A1A1A' : '#f5f5f5'
            }}>
                <h2 style={{ color: isDark ? '#E5E5E5' : '#d32f2f', marginBottom: '12px' }}>{t('oauth.errorTitle')}</h2>
                <p style={{ color: isDark ? '#A8A8A8' : '#424242', marginBottom: '8px' }}>{error}</p>
                <p style={{ color: isDark ? '#A8A8A8' : '#666' }}>{t('oauth.redirecting')}</p>
            </div>
        );
    }

    return (
        <div style={{
            padding: '20px',
            textAlign: 'center',
            marginTop: '50px',
            minHeight: '100vh',
            backgroundColor: isDark ? '#1A1A1A' : '#f5f5f5'
        }}>
            <h2 style={{ color: isDark ? '#E5E5E5' : '#333' }}>{t('oauth.processingGoogle')}</h2>
            <p style={{ color: isDark ? '#A8A8A8' : '#666' }}>{t('oauth.pleaseWait')}</p>
        </div>
    );
};

export default GoogleOAuthPage;