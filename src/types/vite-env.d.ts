interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_PROXY_BASE_URL: string;
    readonly VITE_MERCURE_HUB_URL: string;
    readonly VITE_TELEGRAM_BOT_NAME: string;
    readonly VITE_APP_ORIGIN: string;
    readonly VITE_PAGE_SIZE_MOBILE: string;
    readonly VITE_PAGE_SIZE_DESKTOP: string;
    /** Push в браузере (utils/webPush.ts): конфиг веб-приложения Firebase и ключ VAPID. */
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    readonly VITE_FIREBASE_VAPID_KEY?: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}