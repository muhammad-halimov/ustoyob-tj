#!/usr/bin/env node
/**
 * Снимок данных для первого запуска мобильного приложения (запускается перед `npm run build`).
 *
 * Скачивает с API (VITE_API_BASE_URL — тот же, с которым собирается приложение) то, что нужно главной
 * с первого кадра: справочники (категории, города, районы, подкатегории), ленту свежих объявлений,
 * отзывы и иконки категорий — и кладёт в public/snapshot/. Приложение при самом первом запуске
 * (кэш пуст) показывает главную из снимка сразу, без сети, и тут же тихо обновляет данные
 * (см. src/utils/nativeSnapshot.ts). Что именно и под какими адресами — src/utils/nativeSnapshotManifest.ts.
 *
 * Без VITE_API_BASE_URL (сборка сайта с прокси) и при любой ошибке сети снимок просто не
 * обновляется — сборка не падает, приложение без снимка грузится как раньше.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadEnv } from 'vite';
import {
    SNAPSHOT_DIR, SNAPSHOT_FETCHERS, SNAPSHOT_LOCALES, homeFeedEndpoint, homeReviewsEndpoint,
} from '../src/utils/nativeSnapshotManifest.ts';

const MODE = process.env.MODE || 'production';
const env = { ...loadEnv(MODE, process.cwd(), 'VITE_'), ...process.env };
// Как есть, без правки слэшей: приложение склеивает URL картинок из той же строки (configUtils.API_BASE_URL).
const API = env.VITE_API_BASE_URL || '';
const PAGE_SIZE = Math.min(parseInt(env.VITE_PAGE_SIZE_MOBILE || '10', 10) || 10, 50);
const OUT = path.join('public', SNAPSHOT_DIR);
const MAX_PAGES = 20;

const log = (...args) => console.log('[snapshot]', ...args);

if (!API) {
    log('VITE_API_BASE_URL пуст — снимок не нужен (сборка сайта), пропускаю');
    process.exit(0);
}

const getJson = async (endpoint, locale) => {
    const url = `${API}${endpoint}${endpoint.includes('?') ? '&' : '?'}locale=${locale}`;
    const res = await fetch(url, { headers: { Accept: 'application/ld+json, application/json' } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
};

const itemsOf = (data) => (Array.isArray(data) ? data : data?.['hydra:member'] ?? []);

/** Все страницы, как fetchAllPages в приложении. */
const getAll = async (endpoint, locale) => {
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
        const data = await getJson(`${endpoint}${endpoint.includes('?') ? '&' : '?'}itemsPerPage=50&page=${page}`, locale);
        const items = itemsOf(data);
        all.push(...items);
        const total = Array.isArray(data) ? undefined : data?.['hydra:totalItems'];
        if (items.length < 50 || (typeof total === 'number' && all.length >= total)) break;
    }
    return all;
};

const main = async () => {
    const createdAt = new Date().toISOString();
    const files = {};
    for (const locale of SNAPSHOT_LOCALES) {
        const fetchers = {};
        for (const [name, endpoint] of Object.entries(SNAPSHOT_FETCHERS)) fetchers[name] = await getAll(endpoint, locale);
        const api = {};
        for (const endpoint of [homeFeedEndpoint(null), homeReviewsEndpoint(1, PAGE_SIZE)]) api[endpoint] = await getJson(endpoint, locale);
        files[locale] = { createdAt, locale, fetchers, api };
    }

    // Иконки категорий — ровно те файлы, что грузит главная (resolveImage(..., 'full') → оригинал).
    const images = {};
    const iconBytes = [];
    const seen = new Set();
    for (const locale of SNAPSHOT_LOCALES) {
        for (const category of files[locale].fetchers.categories ?? []) {
            const p = category.imageUrl || (category.image ? `/uploads/categories/${category.image}` : '');
            if (!p || seen.has(p)) continue;
            seen.add(p);
            const url = p.startsWith('http') ? p : `${API}${p}`;
            const res = await fetch(url);
            if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) continue;
            const bytes = Buffer.from(await res.arrayBuffer());
            const name = `${createHash('sha1').update(url).digest('hex').slice(0, 16)}${path.extname(new URL(url).pathname) || '.img'}`;
            images[url] = `${SNAPSHOT_DIR}/img/${name}`;
            iconBytes.push([name, bytes]);
        }
    }

    // Всё скачано — только теперь заменяем старый снимок целиком.
    await rm(OUT, { recursive: true, force: true });
    await mkdir(path.join(OUT, 'img'), { recursive: true });
    for (const [name, bytes] of iconBytes) await writeFile(path.join(OUT, 'img', name), bytes);
    const sizes = [];
    for (const locale of SNAPSHOT_LOCALES) {
        const json = JSON.stringify(files[locale]);
        await writeFile(path.join(OUT, `${locale}.json`), json);
        sizes.push(`${locale} ${Math.round(json.length / 1024)} КБ`);
    }
    await writeFile(path.join(OUT, 'index.json'), JSON.stringify({ createdAt, apiBaseUrl: API, images }));
    const iconKb = Math.round(iconBytes.reduce((sum, [, b]) => sum + b.length, 0) / 1024);
    log(`готово: ${API} — ${sizes.join(', ')}; иконок ${iconBytes.length} (${iconKb} КБ)`);
};

main().catch((err) => {
    log('не удалось обновить снимок, сборка продолжается без изменений:', err.message);
    process.exit(0);
});
