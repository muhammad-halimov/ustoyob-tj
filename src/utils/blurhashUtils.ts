import { decode } from 'blurhash';

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
