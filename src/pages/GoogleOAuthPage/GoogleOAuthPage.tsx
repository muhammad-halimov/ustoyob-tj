import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleOAuthPage: React.FC = () => {
    const navigate = useNavigate();

    console.log('GoogleOAuthPage component mounted');
    console.log('Current URL:', window.location.href);

    useEffect(() => {
        const processOAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');

            if (error) {
                navigate('/?oauth_error=' + encodeURIComponent(error));
                return;
            }

            if (code && state) {
                try {
                    // Сохраняем данные
                    localStorage.setItem('googleAuthCode', code);
                    localStorage.setItem('googleAuthState', state);
                    sessionStorage.setItem('googleAuthCode', code);
                    sessionStorage.setItem('googleAuthState', state);

                    // НЕМЕДЛЕННО проверяем существование пользователя
                    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
                    const checkResponse = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        },
                        body: JSON.stringify({
                            code,
                            state
                            // Не отправляем роль!
                        })
                    });

                    if (checkResponse.ok) {
                        const data = await checkResponse.json();
                        const hasRole = data.user.roles && data.user.roles.length > 0;

                        if (hasRole) {
                            // Пользователь уже существует с ролью
                            console.log('User exists with role, auto-login');

                            // Сохраняем токен
                            localStorage.setItem('authToken', data.token);

                            // Сразу перенаправляем на главную
                            navigate('/');
                            return;
                        }
                    }

                    // Если пользователь не существует или без роли - показываем модалку
                    navigate('/?showAuthModal=true&oauth=google');

                } catch (err) {
                    console.error('Error processing Google OAuth:', err);
                    navigate('/?oauth_error=' + encodeURIComponent('Ошибка обработки авторизации'));
                }
            } else {
                navigate('/');
            }
        };

        processOAuth();
    }, [navigate]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ marginBottom: '20px', color: '#333' }}>Обработка авторизации Google...</h2>
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