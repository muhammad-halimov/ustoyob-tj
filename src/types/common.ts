// ─── Локализация ──────────────────────────────────────────────
/** Supported UI language codes. 'eng' is used (not 'en') to match i18next namespace keys. */
export type Language = 'ru' | 'tj' | 'eng';

// ─── Сортировка и фильтры тикетов ─────────────────────────────
/** Sort options available on ticket listings and search. */
export type SortByType =
    | 'newest'
    | 'oldest'
    | 'price-asc'
    | 'price-desc'
    | 'reviews-asc'
    | 'reviews-desc'
    | 'rating-asc'
    | 'rating-desc';

/** Secondary sort applied after the primary sort (or 'none' to disable). */
export type SecondarySortByType = 'none' | SortByType;

/** Time-window filter for ticket listings. */
export type TimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

// ─── Сортировка и фильтры отзывов ─────────────────────────────
/** Sort options available on the review list. */
export type ReviewSortByType = 'newest' | 'oldest' | 'rating-high' | 'rating-low';

/** Time-window filter for the review list. */
export type ReviewTimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

// ─── Роль пользователя ────────────────────────────────────────
/** Canonical user role. Maps to ROLE_CLIENT / ROLE_MASTER on the backend. */
export type UserRole = 'master' | 'client';
