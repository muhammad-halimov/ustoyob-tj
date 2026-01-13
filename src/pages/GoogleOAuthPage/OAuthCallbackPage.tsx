import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setAuthToken, setAuthTokenExpiry, setUserRole, setUserData, setUserEmail, setUserOccupation } from '../../utils/auth';

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

const OAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const processCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const provider = searchParams.get('provider') as 'google' | 'instagram' | 'facebook';

            console.log('OAuthCallbackPage: Processing callback...');
            console.log('Received params:', {
                provider,
                code: !!code,
                state: !!state,
                error: searchParams.get('error')
            });

            if (!code || !state || !provider) {
                setError('Не удалось получить данные авторизации');
                setLoading(false);
                setTimeout(() => navigate('/'), 3000);
                return;
            }

            try {
                // Получаем сохраненную роль из sessionStorage
                const savedRole = sessionStorage.getItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`) || 'client';
                const savedSpecialty = sessionStorage.getItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);

                console.log(`Using saved role for ${provider}:`, savedRole, 'specialty:', savedSpecialty);

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

                console.log(`Sending ${provider} callback to server with role:`, requestData.role);

                const response = await fetch(`${API_BASE_URL}/api/auth/${provider}/callback`, {
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

                const data: OAuthResponse = await response.json();
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
                    if (data.user.roles && data.user.roles.length > 0) {
                        const roles = data.user.roles.map(r => r.toLowerCase());
                        if (roles.includes('role_master') || roles.includes('master')) {
                            setUserRole('master');
                        } else if (roles.includes('role_client') || roles.includes('client')) {
                            setUserRole('client');
                        } else {
                            setUserRole(savedRole as 'master' | 'client');
                        }
                    } else {
                        setUserRole(savedRole as 'master' | 'client');
                    }

                    // Сохраняем occupation если есть
                    if (data.user.occupation) {
                        setUserOccupation(data.user.occupation);
                    }

                    console.log(`${provider.charAt(0).toUpperCase() + provider.slice(1)} auth successful, redirecting to home...`);

                    // Очищаем временные данные
                    sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Role`);
                    sessionStorage.removeItem(`pending${provider.charAt(0).toUpperCase() + provider.slice(1)}Specialty`);

                    // Редирект на главную
                    navigate('/');

                    // Имитируем событие логина
                    window.dispatchEvent(new Event('login'));
                } else {
                    throw new Error('Данные пользователя не получены');
                }

            } catch (err) {
                console.error('OAuth error:', err);
                setError(err instanceof Error ? err.message : 'Ошибка авторизации');
                setTimeout(() => navigate('/'), 3000);
            } finally {
                setLoading(false);
            }
        };

        processCallback();
    }, [searchParams, navigate]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                padding: '20px'
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }}></div>
                <h2>Обработка авторизации...</h2>
                <p>Пожалуйста, подождите.</p>
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
                margin: '0 auto'
            }}>
                <h2 style={{ color: '#e74c3c', marginBottom: '20px' }}>Ошибка авторизации</h2>
                <p style={{ marginBottom: '20px', fontSize: '16px' }}>{error}</p>
                <p style={{ color: '#7f8c8d' }}>Перенаправление на главную страницу...</p>
            </div>
        );
    }

    return null;
};

export default OAuthCallbackPage;