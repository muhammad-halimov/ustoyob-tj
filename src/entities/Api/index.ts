// Общие типы для API ответов
export interface ApiResponse<T> {
    [key: string]: unknown;
    'hydra:member'?: T[];
    'hydra:totalItems'?: number;
}

// OAuth типы
export interface OAuthResponse {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    scope?: string;
    email?: string;
    name?: string;
    surname?: string;
    image?: string;
    roles?: string[];
}

export interface OAuthErrorResponse {
    error?: string;
    error_description?: string;
    error_uri?: string;
}

// Telegram OAuth типы
export interface TelegramUserData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
}

export interface TelegramAuthResponse {
    access_token: string;
    refresh_token: string;
    user: TelegramUserData;
}