import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface GoogleUserResponse {
    user: {
        id: number;
        email: string;
        name: string;
        surname: string;
        roles: string[];
        oauthType?: {
            googleId: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    token: string;
    message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const GoogleOAuthPage: React.FC = () => {
    const navigate = useNavigate();

    console.log('GoogleOAuthPage component mounted');
    console.log('Current URL:', window.location.href);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (!code || !state) return;

        const processOAuth = async () => {
            if (error) {
                navigate('/?oauth_error=' + encodeURIComponent(error));
                return;
            }

            try {
                const payload: any = { code, state };

                // Если есть роль в localStorage (например, пользователь новый)
                const role = localStorage.getItem('googleRole');
                if (role) {
                    payload.role = role;
                }

                const res = await fetch(`${API_BASE_URL}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(text || 'Ошибка Google OAuth');
                }

                const data: GoogleUserResponse = await res.json();

                // Сохраняем токен и пользователя
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Проверяем роль
                if (data.user.roles && data.user.roles.length > 0) {
                    navigate('/'); // Есть роль — просто логиним
                } else {
                    // Новый пользователь без роли — показываем выбор роли
                    navigate('/?select_role=true');
                }

            } catch (err) {
                console.error('Google OAuth error:', err);
                navigate('/?oauth_error=' + encodeURIComponent(err instanceof Error ? err.message : 'Ошибка'));
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