/**
 * Константы для всех роутов приложения.
 * Изменяй пути здесь, и они обновятся везде автоматически.
 */

// Основные страницы
export const ROUTES = {
    HOME: '/',
    FAVORITES: '/favorites',
    CHATS: '/chats',
    
    // Профили
    PROFILE: '/profile',
    PROFILE_BY_ID: (id: number | string) => `/profile/${id}`,
    PROFILE_CREATE: '/profile/create',
    
    // Тикеты
    TICKET_BY_ID: (id: number | string) => `/ticket/${id}`,
    TICKET_ME: '/ticket/me',
    MY_TICKETS: '/ticket/me',
    TICKET_CREATE: '/ticket/create',
    CREATE_TICKET: '/ticket/create',
    TICKET_EDIT: '/ticket/edit',
    EDIT_TICKET: '/ticket/edit',
    CATEGORY_TICKETS: (id: number | string) => `/ticket/category/${id}`,
    
    // Юридические документы
    PRIVACY_POLICY: '/legal/privacy-policy',
    TERMS_OF_USE: '/legal/terms-of-use',
    PUBLIC_OFFER: '/legal/public-offer',
    
    // OAuth
    AUTH_GOOGLE: '/auth/google',
    AUTH_GOOGLE_CALLBACK: '/auth/google/callback',
    AUTH_FACEBOOK: '/auth/facebook',
    AUTH_FACEBOOK_CALLBACK: '/auth/facebook/callback',
    AUTH_INSTAGRAM: '/auth/instagram',
    AUTH_INSTAGRAM_CALLBACK: '/auth/instagram/callback',
    AUTH_TELEGRAM_CALLBACK: '/auth/telegram/callback',
} as const;

// Паттерны для роутов (используются в createBrowserRouter)
export const ROUTE_PATTERNS = {
    HOME: '/',
    FAVORITES: 'favorites',
    CHATS: 'chats',
    PROFILE: 'profile',
    PROFILE_BY_ID: 'profile/:id',
    TICKET_BY_ID: 'ticket/:id',
    MY_TICKETS: 'ticket/me',
    CREATE_TICKET: 'ticket/create',
    EDIT_TICKET: 'ticket/edit',
    CATEGORY_TICKETS: 'ticket/category/:id',
    PRIVACY_POLICY: 'legal/privacy-policy',
    TERMS_OF_USE: 'legal/terms-of-use',
    PUBLIC_OFFER: 'legal/public-offer',
    
    // OAuth
    AUTH_GOOGLE: '/auth/google',
    AUTH_GOOGLE_CALLBACK: '/auth/google/callback',
    AUTH_FACEBOOK: '/auth/facebook',
    AUTH_FACEBOOK_CALLBACK: '/auth/facebook/callback',
    AUTH_INSTAGRAM: '/auth/instagram',
    AUTH_INSTAGRAM_CALLBACK: '/auth/instagram/callback',
    AUTH_TELEGRAM_CALLBACK: '/auth/telegram/callback',
} as const;
