/**
 * Встроенный снимок данных — самый первый запуск мобильного приложения без ожидания сети.
 *
 * Кэш (utils/apiCache.ts, dataCacheUtils, кэш картинок) делает мгновенными все запуски, кроме
 * первого: в первый раз главной нечего показать, и она ждёт сеть. Поэтому при сборке
 * (scripts/build-mobile-snapshot.mjs) в приложение кладутся справочники, лента и отзывы главной и
 * иконки категорий — public/snapshot/. Если своих данных для текущего языка ещё нет, они до первого
 * рендера подставляются из снимка (только в память), а экраны тут же, как обычно, запрашивают
 * свежие и тихо заменяют ими снимок. Со второго запуска снимок не читается вовсе.
 */
import { Capacitor } from '@capacitor/core';
import { API_BASE_URL } from './configUtils';
import { seedApi } from './apiUtils';
import { getCategories, getCities, getDistricts, getOccupations, getProvinces } from './dataCacheUtils';
import { registerBundledImages } from './imageCacheUtils';
import { getDefaultLocale } from './storageUtils';
import {
    SNAPSHOT_DIR, type SnapshotFetcherName, type SnapshotIndexFile, type SnapshotLocaleFile,
} from './nativeSnapshotManifest';

const FETCHERS: Record<SnapshotFetcherName, { seed: (locale: string, data: never[], timestamp: number) => void }> = {
    categories: getCategories,
    provinces: getProvinces,
    cities: getCities,
    districts: getDistricts,
    occupations: getOccupations,
};

// Файлы лежат в самом приложении — это миллисекунды; таймаут на случай, если что-то пошло не так.
const LOAD_TIMEOUT_MS = 1500;

const readJson = async <T>(path: string): Promise<T> => {
    const res = await fetch(`/${SNAPSHOT_DIR}/${path}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<T>;
};

export async function loadNativeSnapshot(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    const locale = getDefaultLocale();
    // Категории для этого языка уже есть — запуск не первый, снимок не нужен.
    if (getCategories.peekStale(locale) !== undefined) return;
    try {
        const [index, file] = await Promise.race([
            Promise.all([readJson<SnapshotIndexFile>('index.json'), readJson<SnapshotLocaleFile>(`${locale}.json`)]),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)),
        ]);
        // Снимок снят с другого API (другое окружение сборки) — его адреса и данные сюда не подходят.
        if (index.apiBaseUrl !== API_BASE_URL) return;
        registerBundledImages(index.images);
        // Время 0 — всегда «протухшее»: экран берёт снимок сразу, а загрузчик тут же тянет свежие данные
        // и сохраняет их, так что со второго запуска снимок уже не нужен (даже если сборка свежая).
        for (const [name, data] of Object.entries(file.fetchers) as [SnapshotFetcherName, never[]][]) {
            FETCHERS[name]?.seed(locale, data, 0);
        }
        // Как гость (без токена): лента и отзывы у гостя и у вошедшего одни и те же запросы,
        // см. peekApi (подстановка гостевого ответа) и Recommendations.
        for (const [endpoint, data] of Object.entries(file.api)) seedApi(endpoint, { locale, requiresAuth: false }, data);
    } catch {
        // Снимка в сборке нет или он не читается — главная грузится из сети, как раньше.
    }
}
