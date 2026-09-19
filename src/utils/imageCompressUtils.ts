/**
 * Сжатие фото в браузере перед загрузкой (canvas): снимок с камеры — это несколько МБ,
 * и отдавать его на сервер как есть — лишний мобильный трафик, долгая отправка и тяжёлые
 * оригиналы в лентах (бэк превью/WebP сам не делает — см. API_REFERENCE §14, файлы отдаются
 * как загружены). Уменьшаем до разумной стороны и перекодируем.
 *
 * Безопасен по построению: на любой сбой (декодирование, canvas, нет toBlob) или если результат
 * не легче исходника — возвращается ИСХОДНЫЙ файл, загрузка не ломается.
 */

export interface CompressOptions {
    /** Максимальная длинная сторона в пикселях. */
    maxSide?: number;
    /** Качество для lossy-форматов (0–1). */
    quality?: number;
    /** Файлы меньше этого порога и в пределах maxSide не трогаем — выигрыш не стоит потери качества. */
    skipBelowBytes?: number;
}

const DEFAULTS: Required<CompressOptions> = {
    maxSide: 1920,
    quality: 0.82,
    skipBelowBytes: 300 * 1024,
};

// Бэк принимает png/jpeg/jpg/webp (API_REFERENCE §14) — остальное (gif, heic…) не трогаем.
const COMPRESSIBLE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const EXT_BY_TYPE: Record<string, string> = {
    'image/webp': 'webp',
    'image/jpeg': 'jpg',
    'image/png': 'png',
};

const decode = async (file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> => {
    // imageOrientation: 'from-image' — учитывает EXIF-поворот (фото с телефона иначе лягут на бок).
    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
            return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
        } catch {
            // старые браузеры/опции — падаем на <img> ниже
        }
    }
    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('decode_failed'));
            el.src = url;
        });
        return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch (e) {
        URL.revokeObjectURL(url);
        throw e;
    }
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> =>
    new Promise(resolve => canvas.toBlob(resolve, type, quality));

// Умеет ли браузер кодировать WebP через canvas — проверяем один раз на 1×1 (Safari до 17
// молча отдаёт PNG вместо WebP, поэтому смотрим на реальный type блоба, а не на отсутствие ошибки).
let webpSupport: Promise<boolean> | null = null;
const canEncodeWebp = (): Promise<boolean> => {
    if (!webpSupport) {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 1;
        webpSupport = toBlob(probe, 'image/webp', 0.8).then(b => !!b && b.type === 'image/webp').catch(() => false);
    }
    return webpSupport;
};

export async function compressImageFile(file: File, options: CompressOptions = {}): Promise<File> {
    const { maxSide, quality, skipBelowBytes } = { ...DEFAULTS, ...options };
    if (!COMPRESSIBLE.has(file.type)) return file;

    try {
        const { source, width, height, release } = await decode(file);
        try {
            const scale = Math.min(1, maxSide / Math.max(width, height));
            const needsResize = scale < 1;
            if (!needsResize && file.size <= skipBelowBytes) return file;

            const w = Math.max(1, Math.round(width * scale));
            const h = Math.max(1, Math.round(height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) return file;

            // WebP, если браузер его кодирует, иначе JPEG; PNG без WebP оставляем PNG, чтобы не
            // потерять прозрачность.
            const target = (await canEncodeWebp()) ? 'image/webp' : file.type === 'image/png' ? 'image/png' : 'image/jpeg';

            // JPEG не умеет прозрачность — подложка, иначе она станет чёрной.
            if (target === 'image/jpeg') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, w, h);
            }
            ctx.drawImage(source, 0, 0, w, h);
            const blob = await toBlob(canvas, target, target === 'image/png' ? undefined : quality);
            if (!blob || blob.type !== target) return file;

            // Не сжалось (уже оптимизированный файл) и размер не меняли — оставляем оригинал.
            if (!needsResize && blob.size >= file.size) return file;
            if (blob.size >= file.size && target === file.type) return file;

            const base = file.name.replace(/\.[^./\\]+$/, '') || 'photo';
            return new File([blob], `${base}.${EXT_BY_TYPE[target]}`, { type: target, lastModified: Date.now() });
        } finally {
            release();
        }
    } catch {
        return file;
    }
}
