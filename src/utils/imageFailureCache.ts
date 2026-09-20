/**
 * Негативный кэш сгенерированных вариантов картинок (`/media/cache/...`, Liip Imagine).
 *
 * Если бэкенд не смог построить превью (5xx — ответ `no-cache, private`, браузер его не кэширует),
 * каждый показ такой картинки снова стучался в упавший URL и только потом откатывался на оригинал:
 * лишний запрос + мигание на каждой странице. Помним упавшие варианты на время вкладки
 * (sessionStorage), и `<Img>` сразу берёт следующий из цепочки. Оригиналы (`/uploads/`) сюда не
 * попадают — они иммутабельны и кэшируются браузером/Cloudflare штатно.
 */
const KEY = 'imgFailedVariants';
const MAX_ENTRIES = 300;
const isVariantUrl = (src: string) => src.includes('/media/cache/');

let failed: Set<string> | null = null;

const load = (): Set<string> => {
    if (failed) return failed;
    failed = new Set();
    try {
        const raw = JSON.parse(sessionStorage.getItem(KEY) || '[]');
        if (Array.isArray(raw)) raw.forEach(v => typeof v === 'string' && failed!.add(v));
    } catch { /* sessionStorage недоступен/битый — работаем только в памяти */ }
    return failed;
};

export const isImageVariantFailed = (src: string): boolean => isVariantUrl(src) && load().has(src);

export const markImageVariantFailed = (src: string): void => {
    if (!isVariantUrl(src)) return;
    const set = load();
    if (set.has(src)) return;
    set.add(src);
    if (set.size > MAX_ENTRIES) set.delete(set.values().next().value as string);
    try { sessionStorage.setItem(KEY, JSON.stringify([...set])); } catch { /* ignore */ }
};
