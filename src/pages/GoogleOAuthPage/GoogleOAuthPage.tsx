import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GoogleOAuthPage: React.FC = () => {
    const navigate = useNavigate();

    console.log('GoogleOAuthPage component mounted');
    console.log('Current URL:', window.location.href);

    useEffect(() => {
        console.log('GoogleOAuthPage useEffect triggered');

        const processOAuth = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');

            console.log('Google OAuth received:', { code, state, error });

            if (error) {
                console.error('Google OAuth error:', error);
                navigate('/?oauth_error=' + encodeURIComponent(error));
                return;
            }

            if (code && state) {
                try {
                    console.log('Saving Google auth data to localStorage');

                    // Сохраняем код и state в localStorage
                    localStorage.setItem('googleAuthCode', code);
                    localStorage.setItem('googleAuthState', state);

                    console.log('Navigating to home with auth modal flag...');

                    // ВСЕГДА перенаправляем на главную с флагом
                    navigate('/?showAuthModal=true&oauth=google');

                } catch (err) {
                    console.error('Error processing Google OAuth:', err);
                    navigate('/?oauth_error=' + encodeURIComponent('Ошибка обработки авторизации'));
                }
            } else {
                console.log('No code or state found in URL');
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