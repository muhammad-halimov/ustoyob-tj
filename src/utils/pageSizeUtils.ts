/**
 * Returns the number of items per page based on the current viewport width.
 * Values are driven by VITE_PAGE_SIZE_MOBILE and VITE_PAGE_SIZE_DESKTOP env vars.
 */
export function getPageSize(): number {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile
        ? parseInt(import.meta.env.VITE_PAGE_SIZE_MOBILE ?? '10', 10)
        : parseInt(import.meta.env.VITE_PAGE_SIZE_DESKTOP ?? '10', 10);
}
