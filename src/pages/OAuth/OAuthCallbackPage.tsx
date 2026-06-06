import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
import Status from '../../shared/ui/Modal/Status';
import { PageLoader } from '../../widgets/PageLoader';
import { useTranslation } from 'react-i18next';
import { Performers } from '../main/performers/Performers';
import type { PerformerItem } from '../main/performers/Performers';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserRole,
    setUserData,
    setUserEmail,
    setUserOccupation,
    getAuthToken,
} from '../../utils/authUtils';
import type { OAuthProviderName, BackendAuthCallbackResponse } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { getStorageItem, removeStorageItem, getSessionItem, removeSessionItem, removeSessionItems } from '../../utils/storageUtils';

// Определяем провайдер по URL
const getProviderFromUrl = (pathname: string): OAuthProviderName | null => {
    if (pathname.includes('/auth/google')) return 'google';
    if (pathname.includes('/auth/instagram')) return 'instagram';
    if (pathname.includes('/auth/facebook')) return 'facebook';
    return null;
};

/**
 * Handles the OAuth callback for Google / Instagram / Facebook.
 * Reads the `code` query parameter from the URL, exchanges it for a
 * backend JWT via the provider-specific endpoint, stores auth data,
 * and redirects the user to their destination or the home page.
 */
const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [showRoleSelect, setShowRoleSelect] = useState(false);
    const [, setPendingToken] = useState<string | null>(null);
    const [grantingRole, setGrantingRole] = useState(false);
    const [provider, setProvider] = useState<OAuthProviderName | null>(null);
    const [isLinkMode, setIsLinkMode] = useState(false);
    const { t } = useTranslation(['common', 'components']);

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
                // Проверяем sessionStorage (обычный браузер) и localStorage по state (мобильный: новая вкладка)
                const sessionMode = getSessionItem('oauthMode');
                const localMode = state ? getStorageItem(`oauth_mode_${state}`) : null;
                const oauthMode = sessionMode || localMode;
                if (oauthMode === 'link') {
                    removeSessionItem('oauthMode');
                    if (state) removeStorageItem(`oauth_mode_${state}`);
                    setIsLinkMode(true);
                    const jwtToken = getAuthToken();
                    if (!jwtToken) {
                        setError(t('oauth.notAuthenticated') || 'Not authenticated');
                        setLoading(false);
                        return;
                    }
                    const linkData = await universalApiRequest('/api/profile/oauth/link', {
                        method: 'POST',
                        body: { provider: detectedProvider, code, state },
                        locale: false,
                    });
                    if (linkData.error === 'provider_taken' || linkData.error === 'oauth_provider_taken') {
                        setError(linkData.message || t('oauth.providerTaken') || 'This account is already linked to another user');
                        setLoading(false);
                        return;
                    }
                    if (linkData.error === 'already_linked') {
                        setError(linkData.message || t('oauth.alreadyLinked') || 'This provider is already linked to your account');
                        setLoading(false);
                        return;
                    }
                    if (linkData.error) {
                        setError(linkData.message || t('oauth.tryLater'));
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

                // Валидируем CSRF state (sessionStorage доступен только если та же вкладка)
                const savedCsrfState = getSessionItem(`${detectedProvider}CsrfState`);
                if (savedCsrfState && state !== savedCsrfState) {
                    removeSessionItem(`${detectedProvider}CsrfState`);
                    setError(t('oauth.invalidState') || 'Invalid OAuth state. Possible CSRF attack.');
                    setLoading(false);
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                    return;
                }
                removeSessionItem(`${detectedProvider}CsrfState`);

                // Отправляем только code и state — сервер вернёт status 200 (существующий) или 204 (новый)
                const callbackData: BackendAuthCallbackResponse = await universalApiRequest(`/api/auth/${detectedProvider}/callback`, {
                    method: 'POST',
                    body: { code, state },
                    requiresAuth: false,
                    locale: false,
                });

                const data: BackendAuthCallbackResponse = callbackData;

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
                    if (data.user.email) setUserEmail(data.user.email);

                    // Очищаем временные данные
                    removeSessionItems(savedRoleKey, savedSpecialtyKey);

                    if ((data as any).status === 204) {
                        // Новый пользователь — показываем выбор роли
                        setPendingToken(data.token);
                        setLoading(false);
                        setShowRoleSelect(true);
                    } else {
                        // Существующий пользователь — определяем роль из ответа
                        if (data.user.roles && data.user.roles.length > 0) {
                            const roles = data.user.roles.map(r => r.toLowerCase());
                            if (roles.includes('role_master') || roles.includes('master')) {
                                setUserRole('master');
                            } else {
                                setUserRole('client');
                            }
                        }
                        if (data.user.occupation) setUserOccupation(data.user.occupation);

                        setSuccess(true);
                        setTimeout(() => {
                            navigate(ROUTES.HOME);
                            window.dispatchEvent(new Event('login'));
                        }, 2000);
                    }
                } else {
                    setError(resolveApiError(null, t('oauth.tokenNotReceived')));
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                }

            } catch (err) {
                console.error(`${detectedProvider} OAuth error:`, err);
                setError(resolveApiError(err));
                setTimeout(() => navigate(ROUTES.HOME), 3000);
            } finally {
                setLoading(false);
            }
        };

        processCallback();
    }, [searchParams, navigate, t]);

    if (loading) {
        return <PageLoader text={t('oauth.processingVia', { provider: provider === 'google' ? 'Google' : provider === 'instagram' ? 'Instagram' : 'Facebook' })} />;
    }

    if (showRoleSelect) {
        const handleGrantRole = async (role: 'master' | 'client') => {
            setGrantingRole(true);
            try {
                const roleValue = role === 'master' ? 'ROLE_MASTER' : 'ROLE_CLIENT';
                await universalApiRequest('/api/users/grant-role', {
                    method: 'POST',
                    body: { role: roleValue },
                    locale: false,
                });
                setUserRole(role);
                navigate(ROUTES.HOME);
                window.dispatchEvent(new Event('login'));
                setTimeout(() => window.location.reload(), 100);
            } catch (err) {
                setError(resolveApiError(err));
                setShowRoleSelect(false);
            } finally {
                setGrantingRole(false);
                setPendingToken(null);
            }
        };

        const roleItems: PerformerItem[] = [
            { id: 1, name: t('components:roles.customers'), title: t('components:roles.customersDesc'), img: '/img/misc/clientTest.jpg' },
            { id: 2, name: t('components:roles.masters'), title: t('components:roles.mastersDesc'), img: '/img/misc/master.jpg' },
        ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '20px', padding: '20px' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="25" stroke="#4caf50" strokeWidth="2" />
                    <path d="M14 27l8 8 16-16" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#2e7d32', margin: 0 }}>{t('oauth.success')}</p>
                <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{t('oauth.selectAccountType')}</p>
                {grantingRole ? <PageLoader fullPage={false} compact /> : (
                    <Performers
                        items={roleItems}
                        getButtonText={item => item.id === 1 ? t('components:auth.iAmClient') : t('components:auth.iAmSpecialist')}
                        onItemClick={item => handleGrantRole(item.id === 1 ? 'client' : 'master')}
                    />
                )}
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-background-all)', gap: '16px' }}>
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="26" cy="26" r="25" stroke="#4caf50" strokeWidth="2" />
                    <path d="M14 27l8 8 16-16" stroke="#4caf50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#2e7d32', margin: 0 }}>{t('oauth.success')}</p>
            </div>
        );
    }

    return (
        <Status
            type="error"
            isOpen={!!error}
            onClose={() => navigate(isLinkMode ? ROUTES.PROFILE : ROUTES.HOME)}
            message={error}
        />
    );
};

export default OAuthCallbackPage;