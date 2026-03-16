import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import Status from '../../shared/ui/Modal/Status';
import { PageLoader } from '../../widgets/PageLoader';
import { useTranslation } from 'react-i18next';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserRole,
    setUserData,
    setUserEmail,
    setUserOccupation,
    getAuthToken,
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
    user?: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        occupation?: Array<{id: number; title: string; [key: string]: unknown}>;
        [key: string]: unknown;
    };
    token?: string;
    message?: string;
    status?: 'email_required';
    temp_token?: string;
    error?: string;
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
    const [success, setSuccess] = useState(false);
    const [provider, setProvider] = useState<OAuthProvider | null>(null);
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

            // Для Instagram и Facebook
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const errorParam = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');

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
                // Режим привязки провайдера к существующему аккаунту
                const oauthMode = sessionStorage.getItem('oauthMode');
                if (oauthMode === 'link') {
                    const jwtToken = getAuthToken();
                    if (!jwtToken) {
                        setError(t('oauth.notAuthenticated') || 'Not authenticated');
                        setLoading(false);
                        sessionStorage.removeItem('oauthMode');
                        return;
                    }
                    const linkRes = await fetch(`${API_BASE_URL}/api/profile/oauth/link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${jwtToken}`,
                        },
                        body: JSON.stringify({ provider: detectedProvider, code, state }),
                    });
                    const linkData = await linkRes.json();
                    sessionStorage.removeItem('oauthMode');
                    if (linkData.error === 'provider_taken') {
                        setError(t('oauth.providerTaken') || 'This account is already linked to another user');
                        setLoading(false);
                        return;
                    }
                    if (linkData.error === 'already_linked') {
                        setError(t('oauth.alreadyLinked') || 'This provider is already linked to your account');
                        setLoading(false);
                        return;
                    }
                    if (linkData.new_token) {
                        setAuthToken(linkData.new_token);
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());
                    }
                    if (linkData.new_email) {
                        setUserEmail(linkData.new_email);
                    }
                    setSuccess(true);
                    setTimeout(() => navigate(ROUTES.PROFILE, { replace: true }), 2000);
                    return;
                }

                // Получаем сохраненную роль из sessionStorage
                const savedRoleKey = `pending${detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)}Role`;
                const savedSpecialtyKey = `pending${detectedProvider.charAt(0).toUpperCase() + detectedProvider.slice(1)}Specialty`;

                const savedRole = sessionStorage.getItem(savedRoleKey) || 'client';
                const savedSpecialty = sessionStorage.getItem(savedSpecialtyKey);

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

                const response = await fetch(`${API_BASE_URL}/api/auth/${detectedProvider}/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });

                const responseText = await response.text();

                if (!response.ok) {
                    try {
                        const errorData: OAuthErrorResponse = JSON.parse(responseText);
                        throw new Error(errorData.error_description || errorData.message || errorData.error || `HTTP ${response.status}`);
                    } catch (parseError) {
                        throw new Error(`Ошибка сервера: ${response.status} - ${responseText}`);
                    }
                }

                const data: OAuthResponse = JSON.parse(responseText);

                if (data.status === 'email_required' && data.temp_token) {
                    sessionStorage.setItem('telegramTempToken', data.temp_token);
                    navigate(ROUTES.TELEGRAM_LINK_EMAIL);
                    return;
                }

                if (data.error === 'email_taken') {
                    setError(t('oauth.emailTaken'));
                    setLoading(false);
                    return;
                }

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

                    // Очищаем временные данные
                    sessionStorage.removeItem(savedRoleKey);
                    sessionStorage.removeItem(savedSpecialtyKey);

                    setSuccess(true);
                    setTimeout(() => {
                        navigate(ROUTES.HOME);
                        window.dispatchEvent(new Event('login'));
                    }, 2000);
                } else {
                    throw new Error(t('oauth.tokenNotReceived'));
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
        return <PageLoader text={t('oauth.processingVia', { provider: provider === 'google' ? 'Google' : provider === 'instagram' ? 'Instagram' : 'Facebook' })} />;
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '16px' }}>
                <span style={{ fontSize: '52px', color: 'var(--color-actual-blue)' }}>✓</span>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', margin: 0 }}>{t('oauth.success')}</p>
            </div>
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