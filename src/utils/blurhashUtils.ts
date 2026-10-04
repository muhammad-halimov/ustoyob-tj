import { decode, encode } from 'blurhash';

/**
 * BlurHash → data-URL для `background-image` (мгновенная размытая заглушка, пока грузится фото).
 * Декодируем в крошечный 32×32 через canvas: хэш несёт ~4×3 компоненты, больше пикселей
 * информации не прибавит, а CSS `background-size: cover` сам растянет.
 * Результат кэшируется по хэшу — в ленте одно и то же фото может рендериться несколько раз.
 */
const SIZE = 32;
const cache = new Map<string, string>();

export const blurhashToDataUrl = (hash: string | null | undefined): string | undefined => {
    if (!hash) return undefined;
    const cached = cache.get(hash);
    if (cached) return cached;

    try {
        const pixels = decode(hash, SIZE, SIZE);
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        const imageData = ctx.createImageData(SIZE, SIZE);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL();
        cache.set(hash, url);
        return url;
    } catch {
        // Невалидный хэш (например, обрезанная строка) — просто без заглушки.
        return undefined;
    }
};

/**
 * BlurHash для внешних фото (`ResolvedImage.external` — OAuth-аватар Google/Facebook и т.п.),
 * которых нет и не может быть с бэка: бэк их вообще не обрабатывает, только отдаёт прямую ссылку
 * (см. resolveImage() в imageUtils.ts). Считаем сами: грузим картинку в скрытый Image, уменьшаем
 * через canvas и кодируем той же библиотекой. Кэш по URL — избавляет от повторного счёта при
 * каждом новом показе того же аватара (шапка/чаты/отзывы/профиль и т.д. — один и тот же URL), но
 * НЕ спасает самый первый показ конкретного URL за всё время жизни вкладки — до его первой полной
 * загрузки считать попросту не из чего, secret sauce тут нет.
 *
 * CORS: если сторонний сервис не шлёт Access-Control-Allow-Origin, canvas будет tainted и чтение
 * пикселей упадёт — тихо возвращаем undefined (аватар всё равно покажется, просто без заглушки).
 */
const SIZE_EXTERNAL = 32;
const externalCache = new Map<string, string | undefined>();
const externalPending = new Map<string, Promise<string | undefined>>();

export const clearBlurhashCache = (): void => {
    cache.clear();
    externalCache.clear();
    externalPending.clear();
};

export const computeExternalBlurhash = (url: string | null | undefined): Promise<string | undefined> => {
    if (!url) return Promise.resolve(undefined);
    if (externalCache.has(url)) return Promise.resolve(externalCache.get(url));

    const pending = externalPending.get(url);
    if (pending) return pending;

    const promise = new Promise<string | undefined>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = SIZE_EXTERNAL;
                canvas.height = SIZE_EXTERNAL;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(undefined); return; }
                ctx.drawImage(img, 0, 0, SIZE_EXTERNAL, SIZE_EXTERNAL);
                const { data } = ctx.getImageData(0, 0, SIZE_EXTERNAL, SIZE_EXTERNAL);
                resolve(encode(data, SIZE_EXTERNAL, SIZE_EXTERNAL, 4, 3));
            } catch {
                resolve(undefined);
            }
        };
        img.onerror = () => resolve(undefined);
        img.src = url;
    }).then(hash => {
        externalCache.set(url, hash);
        externalPending.delete(url);
        return hash;
    });

    externalPending.set(url, promise);
    return promise;
};
