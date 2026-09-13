import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES, API_ROUTES } from '../../app/routers/routes';
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
} from '../../utils/authUtils';
import type { TelegramUserData, BackendAuthCallbackResponse } from '../../entities';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { getStorageItem, setStorageItem, removeStorageItem, getSessionItem, removeSessionItem, removeSessionItems } from '../../utils/storageUtils';

/**
 * Handles the Telegram login callback.
 * Receives Telegram user data as query params (hash, id, first_name, etc.),
 * verifies it with the backend, stores auth data, and redirects the user.
 * If the Telegram account has no linked email, redirects to TelegramLinkEmailPage.
 */
const TelegramCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const { t } = useTranslation('common');

    useEffect(() => {
        const processTelegramCallback = async () => {
            try {
                // Извлекаем параметры из URL
                const id = searchParams.get('id');
                const firstName = searchParams.get('first_name');
                const lastName = searchParams.get('last_name');
                const username = searchParams.get('username');
                const photoUrl = searchParams.get('photo_url');
                const authDate = searchParams.get('auth_date');
                const hash = searchParams.get('hash');

                // Проверяем что все необходимые параметры есть
                if (!id || !firstName || !hash || !authDate) {
                    setError(t('oauth.insufficientData'));
                    setLoading(false);
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                    return;
                }

                // Проверяем, что запрос не старше 10 минут (для защиты от replay атак)
                const currentTime = Math.floor(Date.now() / 1000);
                const authTime = parseInt(authDate, 10);
                if (currentTime - authTime > 600) {
                    setError(t('oauth.expiredRequest'));
                    setLoading(false);
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                    return;
                }

                // Валидируем хэш (для дополнительной безопасности)
                const telegramData: TelegramUserData = {
                    id: parseInt(id, 10),
                    first_name: firstName,
                    last_name: lastName || undefined,
                    username: username || undefined,
                    photo_url: photoUrl || undefined,
                    auth_date: authTime,
                    hash
                };

                // Примечание: хэш должен быть валидирован на сервере!
                // Заказчик не должен хранить BOT_TOKEN для валидации хэша

                // Режим привязки — отправляем данные напрямую в link endpoint
                // Проверяем sessionStorage (та же вкладка) и localStorage (новая вкладка на мобильном)
                const sessionMode = getSessionItem('oauthMode');
                const localMode = getStorageItem('oauth_mode_telegram');
                const oauthMode = sessionMode || localMode;
                if (oauthMode === 'link') {
                    const jwtToken = getAuthToken();
                    removeSessionItem('oauthMode');
                    removeStorageItem('oauth_mode_telegram');
                    if (!jwtToken) {
                        navigate(ROUTES.HOME, { replace: true });
                        return;
                    }
                    const linkBody: Record<string, unknown> = {
                        provider: 'telegram',
                        id: telegramData.id,
                        hash: telegramData.hash,
                        auth_date: telegramData.auth_date,
                        first_name: telegramData.first_name,
                    };
                    if (telegramData.last_name) linkBody.last_name = telegramData.last_name;
                    if (telegramData.username)  linkBody.username  = telegramData.username;
                    if (telegramData.photo_url) linkBody.photo_url = telegramData.photo_url;
                    const linkData = await universalApiRequest(API_ROUTES.PROFILE_OAUTH_LINK, {
                        method: 'POST',
                        body: linkBody,
                        locale: false,
                    }) as { new_token?: string };
                    if (linkData.new_token) {
                        setAuthToken(linkData.new_token);
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());
                    }
                    setSuccess(true);
                    setLoading(false);
                    // Сигналим оригинальной вкладке и закрываем эту (новая вкладка на мобильном)
                    setStorageItem('telegram_link_success', Date.now().toString());
                    setTimeout(() => {
                        window.close();
                        // Если вкладка не закрылась (та же вкладка) — навигируем
                        setTimeout(() => navigate(ROUTES.PROFILE, { replace: true }), 300);
                    }, 1500);
                    return;
                }

                // Получаем сохраненную роль из sessionStorage
                const savedRole = getSessionItem('pendingTelegramRole') || 'client';
                const savedSpecialty = getSessionItem('pendingTelegramSpecialty');

                // Подготавливаем запрос на бекенд
                // hash/authDate обязательны с 27.08.2026 — бэкенд проверяет
                // подпись виджета (TelegramHashVerifierService) вместо
                // прежнего живого запроса к Bot API, который ломался для
                // любого пользователя, ни разу не писавшего боту.
                const requestData: {
                    id: number;
                    firstName: string;
                    lastName?: string;
                    username?: string;
                    photoUrl?: string;
                    role: string;
                    occupation?: string;
                    hash: string;
                    authDate: number;
                } = {
                    id: telegramData.id,
                    firstName: telegramData.first_name,
                    lastName: telegramData.last_name,
                    username: telegramData.username,
                    photoUrl: telegramData.photo_url,
                    role: savedRole,
                    hash: telegramData.hash!,
                    authDate: telegramData.auth_date!,
                };

                if (savedRole === 'master' && savedSpecialty) {
                    requestData.occupation = API_ROUTES.OCCUPATION_BY_ID(savedSpecialty);
                }

                const data: BackendAuthCallbackResponse = await universalApiRequest(API_ROUTES.AUTH_PROVIDER_CALLBACK('telegram'), {
                    method: 'POST',
                    body: requestData,
                    requiresAuth: false,
                    locale: false,
                });

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
                    removeSessionItems('pendingTelegramRole', 'pendingTelegramSpecialty');

                    setSuccess(true);
                    setLoading(false);
                    // На мобильном приложение Telegram может вернуть этот колбэк в
                    // НОВУЮ вкладку, а не в ту, где была открыта Auth-модалка — сигналим
                    // localStorage'ом (см. слушатель в Auth.tsx) и пробуем закрыться,
                    // как уже делает ветка привязки провайдера выше. window.close()
                    // сработает только если эта вкладка открыта скриптом; если это та
                    // же вкладка (обычный десктоп) — сработает fallback-навигация.
                    setStorageItem('telegram_login_success', Date.now().toString());
                    setTimeout(() => {
                        window.close();
                        setTimeout(() => {
                            navigate(ROUTES.HOME);
                            window.dispatchEvent(new Event('login'));
                        }, 300);
                    }, 2000);
                } else {
                    setError(resolveApiError(null, t('oauth.tokenNotReceived')));
                    setLoading(false);
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                }

            } catch (err) {
                console.error('Telegram OAuth error:', err);
                setError(resolveApiError(err));
                setLoading(false);
                setTimeout(() => navigate(ROUTES.HOME), 3000);
            }
        };

        processTelegramCallback();
    }, [searchParams, navigate, t]);

    if (loading) {
        return <PageLoader text={t('oauth.processingTelegram')} />;
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
            message={error || t('oauth.tryLater')}
        />
    );
};

export default TelegramCallbackPage;
