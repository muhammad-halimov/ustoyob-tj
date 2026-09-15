import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../../widgets/PageLoader';
import Status from '../../shared/ui/Modal/Status';
import { API_ROUTES } from '../../app/routers/routes';
import { universalApiRequest } from '../../utils/apiUtils';
import { resolveApiError } from '../../utils/appMessagesUtils';
import { setSessionItem } from '../../utils/storageUtils';
import { markMobileOAuthFlowFromUrl, finishMobileOAuthFlow } from '../../utils/mobileOAuth';
import type { OAuthProviderName } from '../../entities';

interface OAuthUrlResponse {
    url: string;
}

const getProviderFromPath = (pathname: string): OAuthProviderName | null => {
    if (pathname.includes('/auth/google/')) return 'google';
    if (pathname.includes('/auth/facebook/')) return 'facebook';
    if (pathname.includes('/auth/instagram/')) return 'instagram';
    return null;
};

/**
 * Entry point for the native app's OAuth flow — see utils/mobileOAuth.ts for the full
 * picture. Only ever opened via the app's in-app browser (`?mobile=1`), never linked to
 * from the desktop web UI. Reproduces the "fetch the provider's authorize URL and navigate
 * there" half of Auth.tsx's `handleOAuthStart`, minus everything popup-related (there's no
 * popup here — this whole page load runs on the public website, inside the in-app browser).
 *
 * `role`/`specialty` travel as query params (set by Auth.tsx when opening this page) rather
 * than sessionStorage, since sessionStorage from the *app's own* WebView isn't visible here
 * — this is a separate browser context that only shares storage with itself, from this page
 * load onward. Stored into sessionStorage here so OAuthCallbackPage's existing
 * `pending{Provider}Role` read keeps working unmodified once the provider redirects back.
 */
const OAuthMobileStartPage = () => {
    const { t } = useTranslation('common');
    const [error, setError] = useState('');

    useEffect(() => {
        const provider = getProviderFromPath(window.location.pathname);
        if (!provider) {
            setError(t('oauth.unknownProvider'));
            return;
        }

        markMobileOAuthFlowFromUrl();

        const params = new URLSearchParams(window.location.search);
        const role = params.get('role') || 'client';
        const specialty = params.get('specialty');
        const providerLabel = provider.charAt(0).toUpperCase() + provider.slice(1);
        setSessionItem(`pending${providerLabel}Role`, role);
        if (role === 'master' && specialty) {
            setSessionItem(`pending${providerLabel}Specialty`, specialty);
        }

        universalApiRequest(API_ROUTES.AUTH_PROVIDER_URL(provider), { requiresAuth: false, locale: false })
            .then((data: OAuthUrlResponse) => {
                let parsed: URL;
                try {
                    parsed = new URL(data.url);
                } catch {
                    throw new Error('Получен некорректный URL для авторизации');
                }
                if (!['https:', 'http:'].includes(parsed.protocol)) {
                    throw new Error('Получен некорректный URL для авторизации');
                }

                const state = parsed.searchParams.get('state');
                if (state) setSessionItem(`${provider}CsrfState`, state);

                window.location.href = data.url;
            })
            .catch((err) => {
                const message = resolveApiError(err, `Ошибка при авторизации через ${providerLabel}`);
                setError(message);
                // Возвращаемся в приложение сразу с ошибкой, а не оставляем пользователя
                // висеть на пустом экране in-app browser'а без возможности вернуться сами.
                finishMobileOAuthFlow({ status: 'error', message });
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (error) {
        return <Status type="error" isOpen message={error} onClose={() => window.history.back()} />;
    }

    return <PageLoader text={t('oauth.loading')} />;
};

export default OAuthMobileStartPage;
