/**
 * Кэш картинок в памяти — тот же паттерн, что `createCachedFetcher` в dataCacheUtils (Legal, категории и т.д.):
 * TTL + дедупликация одновременных запросов + ограничение размера. Разница — вместо JSON храним Blob и
 * отдаём `blob:` URL, так что повторный показ той же иконки/аватара в SPA идёт мгновенно, без сети,
 * без редиректов `/media/cache/resolve/… → .webp` и без мигания.
 *
 * Только для небольших повторяющихся картинок (иконки категорий, аватары): подключается на `<Img cache>`.
 * Кэшируем только свой origin/API — внешние (OAuth-аватары Google и т.п.) fetch'ем не достать (CORS).
 * Ответ не-2xx или не `image/*` никогда не кладём в кэш.
 *
 * Подложка в IndexedDB (сами байты Blob, не только blob: URL) — на мобильной (Capacitor) сборке
 * переключение вкладок нижней навигации сбрасывает JS-модули так же, как hard reload (см.
 * getCategories.persistKey в dataCacheUtils и usePersistedState — тот же эффект), а сам in-memory
 * Map, конечно, этого не переживает в принципе. IndexedDB — единственное клиентское хранилище,
 * которое умеет держать Blob напрямую (localStorage — только строки, раздувать в base64 слишком
 * дорого для повторяющихся иконок). Полностью «без мигания» после такого сброса не получится —
 * IndexedDB читается асинхронно, а не синхронно, как in-memory `peekCachedImage` — но замена BlurHash
 * на реальную иконку теперь занимает миллисекунды чтения с диска вместо целого сетевого запроса.
 */
import { API_BASE_URL } from './configUtils';

interface Entry {
    objectUrl: string;
    size: number;
    timestamp: number;
}

const CACHE_DURATION = 30 * 60 * 1000;      // 30 мин, как STATIC_CACHE_DURATION в dataCacheUtils (файлы иммутабельны — хэш в имени)
const MAX_ENTRIES = 200;
const MAX_BYTES = 20 * 1024 * 1024;          // потолок по памяти: иконки/аватары небольшие
const REVOKE_DELAY = 60 * 1000;              // blob: URL освобождаем с запасом — вдруг ещё отображается

const cache = new Map<string, Entry>();      // порядок вставки = порядок «свежести» (LRU)
const inFlight = new Map<string, Promise<string | null>>();
let totalBytes = 0;

// ─── IndexedDB (Blob-подложка, переживает сброс JS-модулей) ─────────────────

const IDB_NAME = 'imageCache';
const IDB_STORE = 'blobs';
const IDB_VERSION = 1;

interface IdbEntry {
    url: string;
    blob: Blob;
    timestamp: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDb = (): Promise<IDBDatabase | null> => {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(IDB_NAME, IDB_VERSION);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(IDB_STORE)) {
                    req.result.createObjectStore(IDB_STORE, { keyPath: 'url' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
    return dbPromise;
};

const idbGet = async (url: string): Promise<IdbEntry | null> => {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(url);
            req.onsuccess = () => resolve((req.result as IdbEntry | undefined) ?? null);
            req.onerror = () => resolve(null);
        } catch {
            resolve(null);
        }
    });
};

const idbPut = async (entry: IdbEntry): Promise<void> => {
    const db = await openDb();
    if (!db) return;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
};

const idbDelete = async (url: string): Promise<void> => {
    const db = await openDb();
    if (!db) return;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).delete(url);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
};

const isCacheable = (url: string): boolean => {
    if (typeof window === 'undefined' || !url || url.startsWith('blob:') || url.startsWith('data:')) return false;
    try {
        const origin = new URL(url, window.location.href).origin;
        if (origin === window.location.origin) return true;
        return !!API_BASE_URL && origin === new URL(API_BASE_URL, window.location.href).origin;
    } catch {
        return false;
    }
};

const drop = (url: string): void => {
    const entry = cache.get(url);
    if (!entry) return;
    cache.delete(url);
    totalBytes -= entry.size;
    setTimeout(() => URL.revokeObjectURL(entry.objectUrl), REVOKE_DELAY);
    // Не просто in-memory промах — сама картинка оказалась битой/не загрузилась, не даём IndexedDB
    // подсовывать её снова после следующего сброса JS-модулей.
    void idbDelete(url);
};

const enforceLimits = (): void => {
    while (cache.size > MAX_ENTRIES || totalBytes > MAX_BYTES) {
        const oldest = cache.keys().next().value;
        if (oldest === undefined) break;
        drop(oldest);
    }
};

/** Регистрирует Blob в in-memory кеше (общее для сетевого фетча и попадания в IndexedDB). */
const registerBlob = (url: string, blob: Blob, timestamp: number): string => {
    const objectUrl = URL.createObjectURL(blob);
    cache.set(url, { objectUrl, size: blob.size, timestamp });
    totalBytes += blob.size;
    enforceLimits();
    return objectUrl;
};

/** Синхронно: готовый `blob:` URL, если картинка уже в кэше и не протухла; иначе `undefined`. */
export const peekCachedImage = (url: string): string | undefined => {
    const entry = cache.get(url);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp >= CACHE_DURATION) {
        drop(url);
        return undefined;
    }
    // LRU: недавно использованное — в конец очереди на вытеснение
    cache.delete(url);
    cache.set(url, entry);
    return entry.objectUrl;
};

/** Кладёт картинку в кэш (если ещё нет) и отдаёт `blob:` URL; `null`, если не удалось/не кэшируется. */
export const getCachedImage = (url: string): Promise<string | null> => {
    const hit = peekCachedImage(url);
    if (hit) return Promise.resolve(hit);
    if (!isCacheable(url)) return Promise.resolve(null);

    const existing = inFlight.get(url);
    if (existing) return existing;

    const promise = (async (): Promise<string | null> => {
        try {
            // IndexedDB — раньше сети: если Blob уже лежал на диске с прошлой сессии/до сброса
            // JS-модулей (мобильная вкладка), не тратим сетевой запрос заново.
            const idbHit = await idbGet(url);
            if (idbHit && Date.now() - idbHit.timestamp < CACHE_DURATION) {
                return registerBlob(url, idbHit.blob, idbHit.timestamp);
            }

            const res = await fetch(url);
            if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
            const blob = await res.blob();
            const timestamp = Date.now();
            void idbPut({ url, blob, timestamp });
            return registerBlob(url, blob, timestamp);
        } catch {
            return null;
        } finally {
            inFlight.delete(url);
        }
    })();

    inFlight.set(url, promise);
    return promise;
};

/**
 * Прогревает кэш и ждёт, пока картинки загрузятся (или пока не выйдет `timeoutMs` — медленная сеть не должна
 * подвешивать экран). Ошибки отдельных картинок не важны — их просто не будет в кэше. Уже закэшированные
 * отдаются синхронно, так что на повторном заходе ожидания нет вообще.
 */
export const preloadImages = async (urls: string[], timeoutMs = 3000): Promise<void> => {
    const pending = urls.filter(u => u && !peekCachedImage(u));
    if (pending.length === 0) return;
    await Promise.race([
        Promise.allSettled(pending.map(getCachedImage)),
        new Promise<void>(resolve => setTimeout(resolve, timeoutMs)),
    ]);
};

/** Выкинуть картинку из кэша (например, когда сам `blob:` перестал грузиться). */
export const evictCachedImage = (url: string): void => drop(url);

export const clearImageCache = (): void => {
    [...cache.keys()].forEach(drop);
    inFlight.clear();
};
