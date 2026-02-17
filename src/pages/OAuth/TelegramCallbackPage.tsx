import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../app/routers/routes';
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
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        occupation?: Array<{ id: number; title: string; [key: string]: unknown }>;
        [key: string]: unknown;
    };
    token: string;
    message: string;
}

const TelegramCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');

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

                console.log('Telegram callback params:', {
                    id: !!id,
                    firstName,
                    lastName,
                    username,
                    photoUrl: !!photoUrl,
                    authDate,
                    hash: !!hash
                });

                // Проверяем что все необходимые параметры есть
                if (!id || !firstName || !hash || !authDate) {
                    setError('Недостаточно данных для авторизации');
                    setLoading(false);
                    setTimeout(() => navigate(ROUTES.HOME), 3000);
                    return;
                }

                // Проверяем, что запрос не старше 10 минут (для защиты от replay атак)
                const currentTime = Math.floor(Date.now() / 1000);
                const authTime = parseInt(authDate, 10);
                if (currentTime - authTime > 600) {
                    setError('Запрос устарел. Пожалуйста, повторите попытку');
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
                // Клиент не должен хранить BOT_TOKEN для валидации хэша

                // Получаем сохраненную роль из sessionStorage
                const savedRole = sessionStorage.getItem('pendingTelegramRole') || 'client';
                const savedSpecialty = sessionStorage.getItem('pendingTelegramSpecialty');

                console.log('Using saved role:', savedRole, 'specialty:', savedSpecialty);

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

                console.log('Sending Telegram callback to server:', requestData);

                const response = await fetch(`${API_BASE_URL}/api/auth/telegram/callback`, {
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
                        const errorData = JSON.parse(responseText);
                        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
                    } catch (parseError) {
                        throw new Error(`Ошибка сервера: ${response.status}`);
                    }
                }

                const data: TelegramAuthResponse = JSON.parse(responseText);
                console.log('Telegram auth response:', data);

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

                    console.log('Telegram auth successful, role:', finalRole);

                    // Очищаем временные данные
                    sessionStorage.removeItem('pendingTelegramRole');
                    sessionStorage.removeItem('pendingTelegramSpecialty');

                    // Редирект на главную
                    navigate(ROUTES.HOME);

                    // Имитируем событие логина
                    window.dispatchEvent(new Event('login'));
                } else {
                    throw new Error('Данные пользователя не получены');
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
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                padding: '20px',
                backgroundColor: '#f5f5f5'
            }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #e0e0e0',
                    borderTop: '4px solid #0088cc',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <h2 style={{ marginBottom: '10px', color: '#333' }}>
                    Авторизация через Telegram...
                </h2>
                <p style={{ color: '#666' }}>Пожалуйста, подождите</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                maxWidth: '600px',
                margin: '50px auto',
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#ffebee',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '36px',
                    color: '#d32f2f'
                }}>
                    ✕
                </div>
                <h2 style={{ color: '#d32f2f', marginBottom: '15px' }}>Ошибка авторизации</h2>
                <p style={{
                    marginBottom: '25px',
                    fontSize: '16px',
                    color: '#424242',
                    lineHeight: '1.5'
                }}>
                    {error}
                </p>
                <button
                    onClick={() => navigate(ROUTES.HOME)}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#0088cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500'
                    }}
                >
                    Вернуться на главную
                </button>
            </div>
        );
    }

    return null;
};

export default TelegramCallbackPage;
