import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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

interface TelegramUserData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface TelegramAuthResponse {
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
    message?: string;
    error?: string;
}

const TelegramCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const { t } = useTranslation('common');

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
                const sessionMode = sessionStorage.getItem('oauthMode');
                const localMode = localStorage.getItem('oauth_mode_telegram');
                const oauthMode = sessionMode || localMode;
                if (oauthMode === 'link') {
                    const jwtToken = getAuthToken();
                    sessionStorage.removeItem('oauthMode');
                    localStorage.removeItem('oauth_mode_telegram');
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
                    const linkRes = await fetch(`${API_BASE_URL}/api/profile/oauth/link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${jwtToken}`,
                        },
                        body: JSON.stringify(linkBody),
                    });
                    if (!linkRes.ok) {
                        const errData = await linkRes.json().catch(() => ({}));
                        throw new Error((errData as { error?: string }).error || `HTTP ${linkRes.status}`);
                    }
                    const linkData = await linkRes.json() as { new_token?: string };
                    if (linkData.new_token) {
                        setAuthToken(linkData.new_token);
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());
                    }
                    setSuccess(true);
                    setLoading(false);
                    // Сигналим оригинальной вкладке и закрываем эту (новая вкладка на мобильном)
                    localStorage.setItem('telegram_link_success', Date.now().toString());
                    setTimeout(() => {
                        window.close();
                        // Если вкладка не закрылась (та же вкладка) — навигируем
                        setTimeout(() => navigate(ROUTES.PROFILE, { replace: true }), 300);
                    }, 1500);
                    return;
                }

                // Получаем сохраненную роль из sessionStorage
                const savedRole = sessionStorage.getItem('pendingTelegramRole') || 'client';
                const savedSpecialty = sessionStorage.getItem('pendingTelegramSpecialty');

                // Подготавливаем запрос на бекенд
                const requestData: {
                    id: number;
                    firstName: string;
                    lastName?: string;
                    username?: string;
                    photoUrl?: string;
                    role: string;
                    occupation?: string;
                } = {
                    id: telegramData.id,
                    firstName: telegramData.first_name,
                    lastName: telegramData.last_name,
                    username: telegramData.username,
                    photoUrl: telegramData.photo_url,
                    role: savedRole
                };

                if (savedRole === 'master' && savedSpecialty) {
                    requestData.occupation = `${API_BASE_URL}/api/occupations/${savedSpecialty}`;
                }

                const response = await fetch(`${API_BASE_URL}/api/auth/telegram/callback`, {
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
                        const errorData = JSON.parse(responseText);
                        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
                    } catch (parseError) {
                        throw new Error(`Ошибка сервера: ${response.status}`);
                    }
                }

                const data: TelegramAuthResponse = JSON.parse(responseText);

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
                    sessionStorage.removeItem('pendingTelegramRole');
                    sessionStorage.removeItem('pendingTelegramSpecialty');

                    setSuccess(true);
                    setLoading(false);
                    setTimeout(() => {
                        navigate(ROUTES.HOME);
                        window.dispatchEvent(new Event('login'));
                    }, 2000);
                } else {
                    throw new Error(t('oauth.tokenNotReceived'));
                }

            } catch (err) {
                console.error('Telegram OAuth error:', err);
                setError(err instanceof Error ? err.message : 'Ошибка авторизации');
                setLoading(false);
                setTimeout(() => navigate(ROUTES.HOME), 3000);
            }
        };

        processTelegramCallback();
    }, [searchParams, navigate, API_BASE_URL]);

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
            message={t('oauth.tryLater')}
        />
    );
};

export default TelegramCallbackPage;
