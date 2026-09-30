import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setSessionItem } from '../../utils/storageUtils';
import { setAuthToken } from '../../utils/authUtils';
import { markMobileOAuthFlowFromUrl } from '../../utils/mobileOAuth';
import { markCodeHandoffFromUrl } from '../../utils/mobileOAuthHandoff';
import { markOAuthPopupFlow } from '../../utils/oauthPopup';

/**
 * Entry point for the Telegram widget button — shared by two callers:
 *  - The native app's in-app browser (`?mobile=1`) — see utils/mobileOAuth.ts.
 *  - The desktop web popup (`?state=...`) — Auth.tsx opens a real popup (same
 *    utils/oauthPopup.ts mechanism as Google/Facebook/Instagram) and navigates it here,
 *    instead of injecting the widget into the current tab's DOM like before. That old
 *    approach made the widget's `data-auth-url` redirect happen in the SAME tab (Telegram
 *    doesn't manage a popup of its own for that), so there was no popup to close — the
 *    whole flow just sat in-place for a few seconds before doing an in-page SPA navigate,
 *    unlike Google/Facebook/Instagram which close their popup and return control instantly.
 *    Running the widget in a popup we opened means `data-auth-url`'s redirect lands INSIDE
 *    that popup, so TelegramCallbackPage can close it the same way as the other providers.
 *
 * The ENTIRE point of running this on a page load of the real public website rather than
 * inside the packaged app is that `data-auth-url` below ends up built from *this* page's
 * `window.location.origin` — the real, BotFather-registered domain — instead of the app's
 * own `https://localhost`, which is exactly what Telegram's "Bot domain invalid" error was
 * about. No BotFather changes needed; just don't run the widget inside the app's bundle.
 *
 * `role` travels as a query param (set by Auth.tsx's SelectRoleModal — see
 * handleNativeTelegramAuthClick/handleTelegramAuthClick — when opening this page), same
 * reasoning as OAuthMobileStartPage: stored into sessionStorage here so
 * TelegramCallbackPage's `pendingTelegramRole` read keeps working unmodified once the
 * widget redirects back.
 */
const TelegramMobileStartPage = () => {
    const { t } = useTranslation('common');

    useEffect(() => {
        markMobileOAuthFlowFromUrl();
        markCodeHandoffFromUrl();

        const params = new URLSearchParams(window.location.search);

        // Привязка к уже существующему аккаунту (Profile.tsx), а не вход — токен
        // приложения приходит прямо в URL и сразу стирается из адресной строки/истории,
        // см. подробный комментарий в OAuthMobileStartPage.tsx (тот же приём для
        // Google/Facebook/Instagram).
        if (params.get('mode') === 'link') {
            const token = params.get('token');
            if (token) setAuthToken(token);
            params.delete('token');
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
            setSessionItem('oauthMode', 'link');
        } else {
            const role = params.get('role');
            if (role) setSessionItem('pendingTelegramRole', role);
        }

        // Desktop popup flow (see file header) — mark it so TelegramCallbackPage's
        // finishOAuthPopup recognizes this state and closes the popup instead of
        // navigating it. Absent for the native in-app-browser flow above.
        const state = params.get('state');
        if (state) markOAuthPopupFlow(state);

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-radius', '10');
        // Дописываем наш state в data-auth-url (Telegram сам добавит id/hash/... через '&') —
        // так TelegramCallbackPage узнáет его обратно (см. finishOrNavigate/oauthStateRef там).
        script.setAttribute('data-auth-url', state
            ? `${window.location.origin}/auth/telegram/callback?state=${encodeURIComponent(state)}`
            : `${window.location.origin}/auth/telegram/callback`);
        script.setAttribute('data-request-access', 'write');

        const container = document.getElementById('telegram-mobile-start-widget');
        container?.appendChild(script);

        return () => { script.remove(); };
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px', padding: '20px', background: 'var(--color-background-all)' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '16px', margin: 0 }}>{t('oauth.loginViaTelegramPrompt', 'Войдите через Telegram')}</p>
            <div id="telegram-mobile-start-widget" />
        </div>
    );
};

export default TelegramMobileStartPage;
