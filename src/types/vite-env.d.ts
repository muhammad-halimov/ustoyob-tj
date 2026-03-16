interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_PROXY_BASE_URL: string;
    readonly VITE_MERCURE_HUB_URL: string;
    readonly VITE_TELEGRAM_BOT_NAME: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}