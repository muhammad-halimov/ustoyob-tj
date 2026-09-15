import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setSessionItem } from '../../utils/storageUtils';
import { markMobileOAuthFlowFromUrl } from '../../utils/mobileOAuth';

/**
 * Entry point for the native app's Telegram login — see utils/mobileOAuth.ts. Only ever
 * opened via the app's in-app browser (`?mobile=1`), never linked to from the desktop web
 * UI (there, the widget is injected directly into the Auth modal — see Auth.tsx).
 *
 * The ENTIRE point of running this on a page load of the real public website rather than
 * inside the packaged app is that `data-auth-url` below ends up built from *this* page's
 * `window.location.origin` — the real, BotFather-registered domain — instead of the app's
 * own `https://localhost`, which is exactly what Telegram's "Bot domain invalid" error was
 * about. No BotFather changes needed; just don't run the widget inside the app's bundle.
 *
 * Role selection isn't available on this bare entry screen (it's meant to load and act
 * immediately, not show its own UI) — defaults to 'client', same fallback
 * TelegramCallbackPage already applies when no role was saved.
 */
const TelegramMobileStartPage = () => {
    const { t } = useTranslation('common');

    useEffect(() => {
        markMobileOAuthFlowFromUrl();
        setSessionItem('pendingTelegramRole', 'client');

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_NAME);
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-userpic', 'false');
        script.setAttribute('data-radius', '10');
        script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram/callback`);
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
