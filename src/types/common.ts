// ─── Локализация ──────────────────────────────────────────────
export type Language = 'ru' | 'tj' | 'eng';

// ─── Сортировка и фильтры тикетов ─────────────────────────────
export type SortByType =
    | 'newest'
    | 'oldest'
    | 'price-asc'
    | 'price-desc'
    | 'reviews-asc'
    | 'reviews-desc'
    | 'rating-asc'
    | 'rating-desc';

export type SecondarySortByType = 'none' | SortByType;

export type TimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

// ─── Сортировка и фильтры отзывов ─────────────────────────────
export type ReviewSortByType = 'newest' | 'oldest' | 'rating-high' | 'rating-low';

export type ReviewTimeFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month';

// ─── Роль пользователя ────────────────────────────────────────
export type UserRole = 'master' | 'client';
