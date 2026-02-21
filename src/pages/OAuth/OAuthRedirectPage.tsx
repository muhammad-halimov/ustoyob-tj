import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts';
import { useTranslation } from 'react-i18next';

// Компонент для перенаправления OAuth callback на общую страницу обработки
const OAuthRedirectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const { t } = useTranslation('common');

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
            backgroundColor: isDark ? '#1A1A1A' : '#f5f5f5'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: `4px solid ${isDark ? '#404040' : '#e0e0e0'}`,
                    borderTop: '4px solid #4285f4',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 20px'
                }}></div>
                <h2 style={{ color: isDark ? '#E5E5E5' : '#333', marginBottom: '10px' }}>{t('oauth.loading')}</h2>
                <p style={{ color: isDark ? '#A8A8A8' : '#666' }}>{t('oauth.pleaseWait')}</p>
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
