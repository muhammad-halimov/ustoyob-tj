import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageLoader } from '../../widgets/PageLoader';
import { useTranslation } from 'react-i18next';

// Компонент для перенаправления OAuth callback на общую страницу обработки
const OAuthRedirectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation('common');

    useEffect(() => {
        // Перенаправляем на страницу обработки callback
        // которая определит провайдера по текущему pathname
        const pathWithoutCallback = location.pathname.replace(/\/callback$/, '');
        const callbackPath = pathWithoutCallback + '/callback' + location.search;
        navigate(callbackPath, { replace: true });
    }, [navigate, location]);

    return <PageLoader text={t('oauth.loading')} />;
};

export default OAuthRedirectPage;
