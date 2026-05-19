import type { User } from '../User';

export interface OAuthProvider {
    id?: number;
    provider: 'google' | 'facebook' | 'instagram' | 'telegram';
    providerId?: string;
    linkedAt?: string;
}

export type OAuthProviderName = OAuthProvider['provider'];

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
    message?: string;
}

export interface TelegramUserData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
    auth_date?: number;
    hash?: string;
}

export interface TelegramAuthResponse {
    access_token: string;
    refresh_token: string;
    user: TelegramUserData;
}

export interface BackendAuthCallbackResponse {
    user?: User;
    token?: string;
    message?: string;
    error?: string;
}
