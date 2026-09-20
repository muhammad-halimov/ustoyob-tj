/**
 * Returns the number of items per page based on the current viewport width.
 * Values are driven by VITE_PAGE_SIZE_MOBILE and VITE_PAGE_SIZE_DESKTOP env vars.
 */
export function getPageSize(): number {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const size = isMobile
        ? parseInt(import.meta.env.VITE_PAGE_SIZE_MOBILE ?? '10', 10)
        : parseInt(import.meta.env.VITE_PAGE_SIZE_DESKTOP ?? '10', 10);
    // Бэкенд отдаёт максимум 50 за страницу и молча режет больше. Если клиент считает `hasMore` по завышенному
    // размеру (page * size < total), а сервер вернул 50 — хвост списка теряется. Поэтому потолок = серверный.
    return Number.isFinite(size) && size > 0 ? Math.min(size, 50) : 10;
}
