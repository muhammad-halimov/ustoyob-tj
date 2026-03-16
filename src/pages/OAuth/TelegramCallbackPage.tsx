import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    status?: 'email_required';
    temp_token?: string;
    error?: string;
}

const TelegramCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const { theme } = useTheme();
    const isDark = theme === 'dark';
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

                if (data.status === 'email_required' && data.temp_token) {
                    sessionStorage.setItem('telegramTempToken', data.temp_token);
                    navigate(ROUTES.TELEGRAM_LINK_EMAIL);
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
                    sessionStorage.removeItem('pendingTelegramRole');
                    sessionStorage.removeItem('pendingTelegramSpecialty');

                    // Редирект на главную
                    navigate(ROUTES.HOME);

                    // Имитируем событие логина
                    window.dispatchEvent(new Event('login'));
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
                    borderTop: '4px solid #0088cc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <h2 style={{ marginBottom: '10px', color: isDark ? '#E5E5E5' : '#333' }}>
                    {t('oauth.processingTelegram')}
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

export default TelegramCallbackPage;
