import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

// Типы для провайдеров
type OAuthProvider = 'google' | 'instagram' | 'facebook';

// Определяем провайдер по URL
const getProviderFromUrl = (pathname: string): OAuthProvider | null => {
    if (pathname.includes('/auth/google')) return 'google';
    if (pathname.includes('/auth/instagram')) return 'instagram';
    if (pathname.includes('/auth/facebook')) return 'facebook';
    return null;
};

interface OAuthResponse {
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        occupation?: Array<{id: number; title: string; [key: string]: unknown}>;
        [key: string]: unknown;
    };
    token: string;
    message: string;
}

interface OAuthErrorResponse {
    error?: string;
    error_description?: string;
    message?: string;
}

const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<OAuthProvider | null>(null);
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useTranslation('common');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        // Определяем провайдер по URL
        const detectedProvider = getProviderFromUrl(window.location.pathname);
        setProvider(detectedProvider);

        if (!detectedProvider) {
            setError(t('oauth.unknownProvider'));
            setLoading(false);
            setTimeout(() => navigate(ROUTES.HOME), 3000);
            return;
        }

        const processCallback = async () => {
            console.log(`Processing ${detectedProvider} callback...`);

            // Для Google есть отдельная страница, перенаправляем
            if (detectedProvider === 'google') {
                console.log('Redirecting to GoogleOAuthPage...');
                window.location.href = window.location.href.replace('/auth/instagram/callback', '/auth/google/callback');
                return;
            }

            // Для Instagram и Facebook
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

            console.log(`${detectedProvider} callback params:`, {
                code: !!code,
                state: !!state,
                error: errorParam,
                errorDescription
            });

            // Обработка ошибок от провайдера
            if (errorParam) {
                const errorMsg = errorDescription || errorParam;
                setError(`${t('oauth.errorTitle')} (${detectedProvider}): ${decodeURIComponent(errorMsg)}`);
                setLoading(false);
                setTimeout(() => navigate(ROUTES.HOME), 3000);
                return;
            }

            if (!code || !state) {
                setError(t('oauth.noAuthData'));
                setLoading(false);
                setTimeout(() => navigate(ROUTES.HOME), 3000);
                return;
            }

            try {
                // Получаем сохраненную роль из sessionStorage
                const savedRoleKey = `pending${detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)}Role`;
                const savedSpecialtyKey = `pending${detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)}Specialty`;

                const savedRole = sessionStorage.getItem(savedRoleKey) || 'client';
                const savedSpecialty = sessionStorage.getItem(savedSpecialtyKey);

                console.log(`Using saved role for ${detectedProvider}:`, savedRole, 'specialty:', savedSpecialty);

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

                console.log(`Sending ${detectedProvider} callback to server:`, {
                    url: `${API_BASE_URL}/api/auth/${detectedProvider}/callback`,
                    data: requestData
                });

                const response = await fetch(`${API_BASE_URL}/api/auth/${detectedProvider}/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                const responseText = await response.text();
                console.log('Server response:', response.status, responseText);

                if (!response.ok) {
                    try {
                        const errorData: OAuthErrorResponse = JSON.parse(responseText);
                        throw new Error(errorData.error_description || errorData.message || errorData.error || `HTTP ${response.status}`);
                    } catch (parseError) {
                        throw new Error(`Ошибка сервера: ${response.status} - ${responseText}`);
                    }
                }

                const data: OAuthResponse = JSON.parse(responseText);
                console.log('Server response data:', data);

                // Сохраняем токен и данные пользователя
                if (data.token && data.user) {
                    setAuthToken(data.token);

                    // Устанавливаем срок действия токена
                    const expiryTime = new Date();
                    expiryTime.setHours(expiryTime.getHours() + 1);
                    setAuthTokenExpiry(expiryTime.toISOString());

                    // Сохраняем данные пользователя
                    setUserData(data.user);

                    if (data.user.email) {
                        setUserEmail(data.user.email);
                    }

                    // Определяем и сохраняем роль
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

                    // Сохраняем occupation если есть
                    if (data.user.occupation) {
                        setUserOccupation(data.user.occupation);
                    }

                    console.log(`${detectedProvider} auth successful, role: ${finalRole}`);

                    // Очищаем временные данные
                    sessionStorage.removeItem(savedRoleKey);
                    sessionStorage.removeItem(savedSpecialtyKey);

                    // Редирект на главную
                    navigate(ROUTES.HOME);

                    // Имитируем событие логина
                    window.dispatchEvent(new Event('login'));
                } else {
                    throw new Error('Данные пользователя не получены');
                }

            } catch (err) {
                console.error(`${detectedProvider} OAuth error:`, err);
                setError(err instanceof Error ? err.message : 'Ошибка авторизации');
                setTimeout(() => navigate(ROUTES.HOME), 3000);
            } finally {
                setLoading(false);
            }
        };

        processCallback();
    }, [searchParams, navigate, API_BASE_URL]);

    if (loading) {
        return (
            <>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                padding: '20px',
                backgroundColor: isDark ? '#1A1A1A' : '#f5f5f5'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: `4px solid ${isDark ? '#404040' : '#e0e0e0'}`,
                    borderTop: '4px solid #4285f4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <h2 style={{ marginBottom: '10px', color: isDark ? '#E5E5E5' : '#333' }}>
                    {t('oauth.processingVia', { provider: provider === 'google' ? 'Google' : provider === 'instagram' ? 'Instagram' : 'Facebook' })}
                </h2>
                <p style={{ color: isDark ? '#A8A8A8' : '#666' }}>{t('oauth.pleaseWait')}</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
            <Status
                type="error"
                isOpen={!!error}
                onClose={() => navigate(ROUTES.HOME)}
                message={t('oauth.tryLater')}
            />
        </>
        );
    }

    return (
        <Status
            type="error"
            isOpen={!!error}
            onClose={() => navigate(ROUTES.HOME)}
            message={t('oauth.tryLater')}
        />
    );
};

export default OAuthCallbackPage;