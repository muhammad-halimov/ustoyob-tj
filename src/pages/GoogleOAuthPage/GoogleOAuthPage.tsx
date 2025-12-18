import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    setAuthToken,
    setAuthTokenExpiry,
    setUserData,
    setUserEmail,
    setUserRole,
} from '../../utils/auth';

const GoogleOAuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        const processGoogleCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');

            // Очищаем URL сразу
            window.history.replaceState({}, '', window.location.pathname);

            if (error) {
                console.error('Google OAuth error:', error);
                navigate('/?oauth_error=' + encodeURIComponent(error));
                return;
            }

            if (!code || !state) {
                console.error('Missing code or state');
                navigate('/?error=missing_auth_params');
                return;
            }

            try {
                // 1. Отправляем код на сервер для получения токена
                const response = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ code, state })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
                }

                const data = await response.json();

                if (data.token && data.user) {
                    // 2. Сохраняем данные пользователя
                    setAuthToken(data.token);
                    setUserData(data.user);

                    if (data.user.email) {
                        setUserEmail(data.user.email);
                    }

                    // 3. Проверяем наличие роли
                    const hasRole = data.user.roles && data.user.roles.length > 0;

                    if (hasRole) {
                        // Устанавливаем роль
                        const role = data.user.roles[0];
                        if (role.includes('MASTER') || role.includes('master')) {
                            setUserRole('master');
                        } else if (role.includes('CLIENT') || role.includes('client')) {
                            setUserRole('client');
                        }

                        // Устанавливаем время истечения токена
                        const expiryTime = new Date();
                        expiryTime.setHours(expiryTime.getHours() + 1);
                        setAuthTokenExpiry(expiryTime.toISOString());

                        // Перенаправляем на главную
                        navigate('/', { replace: true });
                    } else {
                        // Нет роли - показываем выбор роли
                        // Сохраняем данные для выбора роли
                        sessionStorage.setItem('googleUserData', JSON.stringify(data.user));
                        sessionStorage.setItem('googleAuthToken', data.token);
                        navigate('/?google_role_select=true', { replace: true });
                    }
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (err) {
                console.error('Google OAuth processing error:', err);
                navigate('/?error=oauth_failed');
            }
        };

        processGoogleCallback();
    }, [navigate, searchParams, API_BASE_URL]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Авторизация через Google...</h2>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '5px solid #f3f3f3',
                    borderTop: '5px solid #4285f4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '20px auto'
                }}></div>
                <p style={{ marginTop: '20px', color: '#666' }}>Пожалуйста, подождите...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default GoogleOAuthPage;