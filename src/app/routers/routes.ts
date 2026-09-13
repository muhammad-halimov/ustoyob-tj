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
    
    // Тикеты
    TICKET_BY_ID: (id: number | string) => `/ticket/${id}`,
    TICKET_ME: '/ticket/me',
    MY_TICKETS: '/ticket/me',
    TICKET_CREATE: '/ticket/new',
    TICKET_EDIT_BY_ID: (id: number | string) => `/ticket/${id}/edit`,
    CATEGORY_TICKETS_BY_ID: (id: number | string) => `/ticket/category/${id}`,
    
    // Юридические документы
    PRIVACY_POLICY: '/legal/privacy-policy',
    TERMS_OF_USE: '/legal/terms-of-use',
    PUBLIC_OFFER: '/legal/public-offer',

    // Поддержка
    TECH_SUPPORT: '/support',
    
    // Auth
    CONFIRM_ACCOUNT: (token: string) => `/confirm-account/${token}`,

    // OAuth
    AUTH_GOOGLE: '/auth/google',
    AUTH_GOOGLE_CALLBACK: '/auth/google/callback',
    AUTH_FACEBOOK: '/auth/facebook',
    AUTH_FACEBOOK_CALLBACK: '/auth/facebook/callback',
    AUTH_INSTAGRAM: '/auth/instagram',
    AUTH_INSTAGRAM_CALLBACK: '/auth/instagram/callback',
    AUTH_TELEGRAM_CALLBACK: '/auth/telegram/callback',
} as const;

/**
 * Константы для всех эндпоинтов бэкенд-API (см. API_REFERENCE.md).
 * Меняй пути здесь — обновятся везде, где используются.
 * Параметризованные путём — функции; query-строки (?page=, ?itemsPerPage= и т.п.) собираются
 * на месте вызова, поверх этих констант, а не зашиты внутрь них — они специфичны для каждого
 * конкретного запроса.
 */
export const API_ROUTES = {
    // Auth
    AUTHENTICATION_TOKEN: '/api/authentication_token',
    REFRESH_TOKEN: '/api/refresh_token',
    INVALIDATE_TOKEN: '/api/invalidate_token',
    LOGOUT: '/api/logout',
    CONFIRM_ACCOUNT: '/api/confirm-account/',
    CONFIRM_ACCOUNT_TOKENLESS: '/api/confirm-account-tokenless/',
    CHANGE_PASSWORD_SEND_OTP: '/api/change-password/send-otp/',
    CHANGE_PASSWORD: '/api/change-password/',
    USERS_GRANT_ROLE: '/api/users/grant-role',

    // OAuth
    AUTH_PROVIDER_URL: (provider: string) => `/api/auth/${provider}/url`,
    AUTH_PROVIDER_CALLBACK: (provider: string) => `/api/auth/${provider}/callback`,
    AUTH_TELEGRAM_COMPLETE: '/api/auth/telegram/complete',
    AUTH_TELEGRAM_LINK_EMAIL: '/api/auth/telegram/link-email',
    PROFILE_OAUTH_LINK: '/api/profile/oauth/link',
    PROFILE_OAUTH_UNLINK: (provider: string) => `/api/profile/oauth/unlink/${provider}`,
    PROFILE_OAUTH_PROVIDERS: '/api/profile/oauth/providers',

    // Users
    USERS: '/api/users',
    USERS_ME: '/api/users/me',
    USER_BY_ID: (id: number | string) => `/api/users/${id}`,
    USER_PROFILE_PHOTO: (id: number | string) => `/api/${id}/profile-photo`,
    USERS_SOCIAL_NETWORKS: '/api/users/social-networks',
    USERS_PING: '/api/users/ping',
    USERS_OFFLINE: '/api/users/offline',

    // Tickets
    TICKETS: '/api/tickets',
    TICKETS_ME: '/api/tickets/me',
    TICKET_BY_ID: (id: number | string) => `/api/tickets/${id}`,

    // Categories / occupations (mostly cached via dataCacheUtils — see there for collection GETs)
    PROVINCES: '/api/provinces',
    PROVINCE_BY_ID: (id: number | string) => `/api/provinces/${id}`,
    CITIES: '/api/cities',
    CITY_BY_ID: (id: number | string) => `/api/cities/${id}`,
    SUBURBS: '/api/suburbs',
    SUBURB_BY_ID: (id: number | string) => `/api/suburbs/${id}`,
    DISTRICTS: '/api/districts',
    DISTRICT_BY_ID: (id: number | string) => `/api/districts/${id}`,
    SETTLEMENTS: '/api/settlements',
    SETTLEMENT_BY_ID: (id: number | string) => `/api/settlements/${id}`,
    COMMUNITIES: '/api/communities',
    COMMUNITY_BY_ID: (id: number | string) => `/api/communities/${id}`,
    VILLAGES: '/api/villages',
    VILLAGE_BY_ID: (id: number | string) => `/api/villages/${id}`,
    OCCUPATIONS: '/api/occupations',
    OCCUPATION_BY_ID: (id: number | string) => `/api/occupations/${id}`,
    UNITS: '/api/units',
    CATEGORY_BY_ID: (id: number | string) => `/api/categories/${id}`,
    CATEGORIES: '/api/categories',

    // Chats
    CHATS: '/api/chats',
    CHATS_ME: '/api/chats/me',
    CHATS_INBOX_TOKEN: '/api/chats/inbox-token',
    CHAT_BY_ID: (id: number | string) => `/api/chats/${id}`,
    CHAT_MESSAGES: (chatId: number | string) => `/api/chats/${chatId}/messages`,
    CHAT_READ: (chatId: number | string) => `/api/chats/${chatId}/read`,
    CHAT_MESSAGES_CREATE: '/api/chat-messages',
    CHAT_MESSAGE_BY_ID: (id: number | string) => `/api/chat-messages/${id}`,

    // Galleries
    GALLERIES: '/api/galleries',
    GALLERIES_ME: '/api/galleries/me',
    GALLERY_BY_ID: (id: number | string) => `/api/galleries/${id}`,

    // Reviews
    REVIEWS: '/api/reviews',
    REVIEW_BY_ID: (id: number | string) => `/api/reviews/${id}`,

    // Appeals
    APPEALS: '/api/appeals',
    APPEAL_REASONS: '/api/appeal-reasons',
    APPEAL_REASON_BY_ID: (id: number | string) => `/api/appeal-reasons/${id}`,

    // Favorites
    FAVORITES: '/api/favorites',
    FAVORITES_ME: '/api/favorites/me',
    FAVORITE_BY_ID: (id: number | string) => `/api/favorites/${id}`,

    // Blacklist
    BLACKLIST: '/api/black-lists',
    BLACKLIST_ME: '/api/black-lists/me',
    BLACKLIST_BY_ID: (id: number | string) => `/api/black-lists/${id}`,

    // Tech support
    TECH_SUPPORTS_ME: '/api/tech-supports/me',
    TECH_SUPPORTS: '/api/tech-supports',
    TECH_SUPPORTS_INBOX_TOKEN: '/api/tech-supports/inbox-token',
    TECH_SUPPORT_BY_ID: (id: number | string) => `/api/tech-supports/${id}`,
    TECH_SUPPORT_SUBSCRIBE: (id: number | string) => `/api/tech-supports/${id}/subscribe`,
    TECH_SUPPORT_READ: (id: number | string) => `/api/tech-supports/${id}/read`,
    TECH_SUPPORT_MESSAGES_CREATE: '/api/tech-support-messages',
    TECH_SUPPORT_MESSAGE_BY_ID: (id: number | string) => `/api/tech-support-messages/${id}`,

    // Shared / cross-cutting (§14)
    LEGAL_DOCUMENTS: '/api/legals',
    APP_MESSAGES: '/api/app-messages',
    MULTIPLE_IMAGE_BY_ID: (id: number | string) => `/api/multiple-images/${id}`,
    /** Universal image-upload pattern: POST /api/{resource}/{id}/upload-images — used generically by imageUtils.ts. */
    UPLOAD_IMAGES: (resource: string, id: number | string) => `/api/${resource}/${id}/upload-images`,
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
    CREATE_TICKET: 'ticket/new',
    EDIT_TICKET: 'ticket/:id/edit',
    CATEGORY_TICKETS_BY_ID: 'ticket/category/:id',
    PRIVACY_POLICY: 'legal/privacy-policy',
    TERMS_OF_USE: 'legal/terms-of-use',
    PUBLIC_OFFER: 'legal/public-offer',
    TECH_SUPPORT: 'support',
    NOT_FOUND: '*',

    // Auth
    CONFIRM_ACCOUNT: '/confirm-account/:token',

    // OAuth
    AUTH_GOOGLE: '/auth/google',
    AUTH_GOOGLE_CALLBACK: '/auth/google/callback',
    AUTH_FACEBOOK: '/auth/facebook',
    AUTH_FACEBOOK_CALLBACK: '/auth/facebook/callback',
    AUTH_INSTAGRAM: '/auth/instagram',
    AUTH_INSTAGRAM_CALLBACK: '/auth/instagram/callback',
    AUTH_TELEGRAM_CALLBACK: '/auth/telegram/callback',
} as const;
