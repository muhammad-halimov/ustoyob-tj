import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Компонент для перенаправления OAuth callback на общую страницу обработки
const OAuthRedirectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Перенаправляем на страницу обработки callback
        // которая определит провайдера по текущему pathname
        const callbackPath = location.pathname.replace(/^\/auth\//, '/auth/') + '/callback' + location.search;
        navigate(callbackPath, { replace: true });
    }, [navigate, location]);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#f5f5f5'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #e0e0e0',
                    borderTop: '4px solid #4285f4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h2 style={{ color: '#333', marginBottom: '10px' }}>Авторизация...</h2>
                <p style={{ color: '#666' }}>Пожалуйста, подождите</p>
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

export default OAuthRedirectPage;
