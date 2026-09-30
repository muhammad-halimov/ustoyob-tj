/**
 * Кэш GET-ответов API для stale-while-revalidate — ТОЛЬКО нативная (Capacitor) сборка; на сайте
 * выключен целиком (peek всегда пуст, запись ничего не делает), поведение сайта не меняется.
 *
 * Как пользоваться на экране:
 *   const cached = peekApi(url);                 // синхронно: последний ответ или undefined
 *   if (cached) apply(cached); else setLoading(true);
 *   const fresh = await universalApiRequest(url); // запрос уходит всегда; ответ сам попадает в кэш
 *   if (!cached || !sameResponse(cached, fresh)) apply(fresh);
 * — экран открывается мгновенно с прошлыми данными, свежие тихо подменяют их, как в нативных
 * приложениях. Ключ — итоговый URL (с ?locale=) + пользователь: у разных аккаунтов разный кэш,
 * при выходе кэш очищается целиком.
 *
 * Хранилище: память (Map) + localStorage (переживает перезапуск приложения — первый заход на экран
 * после старта тоже мгновенный). Лимиты: MAX_ENTRY_CHARS на ответ, MAX_ENTRIES записей (LRU);
 * при переполнении localStorage выкидываются самые старые.
 */
import { Capacitor } from '@capacitor/core';

const ENABLED = Capacitor.isNativePlatform();
const PREFIX = 'apiCache:';
const INDEX_KEY = `${PREFIX}index`;
const MAX_ENTRIES = 80;
const MAX_ENTRY_CHARS = 200_000;
// Общий потолок в localStorage — у приложения там и свои данные (токены, настройки, справочники).
const MAX_TOTAL_CHARS = 2_000_000;

const memory = new Map<string, unknown>();
type IndexEntry = [storageKey: string, chars: number];
let index: IndexEntry[] | null = null; // от старых к новым

const loadIndex = (): IndexEntry[] => {
    if (index) return index;
    try {
        const raw = localStorage.getItem(INDEX_KEY);
        const parsed = raw ? (JSON.parse(raw) as unknown) : [];
        index = Array.isArray(parsed) ? parsed.filter((e): e is IndexEntry => Array.isArray(e) && typeof e[0] === 'string') : [];
    } catch {
        index = [];
    }
    return index;
};

const dropOldest = (idx: IndexEntry[]): boolean => {
    const oldest = idx.shift();
    if (!oldest) return false;
    try { localStorage.removeItem(oldest[0]); } catch { /* ignore */ }
    return true;
};

const saveIndex = () => {
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(index ?? [])); } catch { /* ignore */ }
};

/** Кто залогинен — из payload JWT (Lexik кладёт туда username); без токена — аноним. */
const userScope = (token: string | null): string => {
    if (!token) return 'anon';
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return String(payload.username ?? payload.email ?? payload.id ?? 'user');
    } catch {
        return 'user';
    }
};

export const apiCacheKey = (url: string, token: string | null): string => `${userScope(token)}|${url}`;

export const peekByKey = (key: string): unknown => {
    if (!ENABLED) return undefined;
    if (memory.has(key)) return memory.get(key);
    try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw == null) return undefined;
        const value = JSON.parse(raw) as unknown;
        memory.set(key, value);
        return value;
    } catch {
        return undefined;
    }
};

export const storeByKey = (key: string, value: unknown, rawText: string): void => {
    if (!ENABLED) return;
    memory.set(key, value);
    if (rawText.length > MAX_ENTRY_CHARS) return;
    const idx = loadIndex();
    const storageKey = PREFIX + key;
    const pos = idx.findIndex(e => e[0] === storageKey);
    if (pos !== -1) idx.splice(pos, 1);
    const total = () => idx.reduce((sum, e) => sum + e[1], 0);
    while (idx.length >= MAX_ENTRIES || (idx.length > 0 && total() + rawText.length > MAX_TOTAL_CHARS)) {
        if (!dropOldest(idx)) break;
    }
    let stored = false;
    for (let attempt = 0; attempt < 5 && !stored; attempt++) {
        try {
            localStorage.setItem(storageKey, rawText);
            stored = true;
        } catch {
            // Переполнение localStorage — освобождаем место самыми старыми записями и пробуем ещё раз.
            if (!dropOldest(idx)) break;
        }
    }
    if (stored) idx.push([storageKey, rawText.length]);
    saveIndex();
};

/** Только в память (без localStorage) — для подсказок, выведенных из других ответов, см. seed в apiUtils. */
export const seedMemoryByKey = (key: string, value: unknown): void => {
    if (!ENABLED) return;
    memory.set(key, value);
};

/** Одинаковые ли ответы — чтобы не перерисовывать экран, если сервер вернул то же самое. */
export const sameResponse = (a: unknown, b: unknown): boolean => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

export const clearApiCache = (): void => {
    memory.clear();
    const idx = loadIndex();
    for (const [k] of idx) try { localStorage.removeItem(k); } catch { /* ignore */ }
    index = [];
    saveIndex();
};

if (ENABLED && typeof window !== 'undefined') {
    window.addEventListener('logout', clearApiCache);
    // Ранние сборки успели сохранить то, что теперь не кэшируется (см. NOT_CACHED в apiUtils):
    // токены подписок и справочники — вычищаем.
    try {
        const notCached = /token|\/api\/(provinces|cities|districts|occupations|categories|units)\?/i;
        const idx = loadIndex();
        const stale = idx.filter(([k]) => notCached.test(k));
        if (stale.length) {
            stale.forEach(([k]) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
            index = idx.filter(([k]) => !notCached.test(k));
            saveIndex();
        }
    } catch { /* ignore */ }
}
