/**
 * Фоновая предзагрузка основных экранов — только мобильная сборка и только залогиненный пользователь.
 * После того как главная готова (`app:ready`), а сразу после входа — немедленно, тихо запрашиваем
 * данные экранов, куда обычно идут дальше: ответы ложатся в кэш API (utils/apiCache.ts), и даже первый
 * заход на экран после установки, входа или перезапуска открывается сразу, без спиннера.
 *
 * URL и параметры должны в точности совпадать с тем, что запрашивает сам экран, — иначе ключ кэша
 * не совпадёт. Запросы идут по одному, чтобы не мешать тому, что пользователь делает на экране.
 */
import { Capacitor } from '@capacitor/core';
import { API_ROUTES } from '../app/routers/routes';
import { ApiError } from './appMessagesUtils';
import { getAuthToken } from './authUtils';
import i18n from 'i18next';
import { getAppealReasons, getDistricts, getLegalDocuments, getMyTechSupports } from './dataCacheUtils';
import { getPageSize } from './pageSizeUtils';
import { peekApi, rememberApi, universalApiRequest, type ApiRequestOptions } from './apiUtils';
import { APP_READY_EVENT } from './nativeSplash';
import { prefetchChatMessages } from './nativeChatPrefetch';

const START_DELAY_MS = 1500;

/** GET в кэш; пустой /me-список бэкенд отдаёт 404 — запоминаем его как пустой, как это делают экраны. */
const warm = async (endpoint: string, options: ApiRequestOptions = {}): Promise<unknown> => {
    try {
        return await universalApiRequest(endpoint, options);
    } catch (err) {
        if (err instanceof ApiError && err.http === 404) rememberApi(endpoint, options, []);
        return undefined;
    }
};

const chatsFirstPage = (): string => `${API_ROUTES.CHATS_ME}?page=1&itemsPerPage=${getPageSize()}`;

/** Личные экраны (только для вошедшего): чаты (+ переписки верхних), избранное, мои объявления, профиль, ТП. */
const prefetchPersonal = async (): Promise<void> => {
    if (!getAuthToken()) return;
    const pageSize = getPageSize();
    const chats = await warm(chatsFirstPage(), { locale: false });
    // Переписки верхних чатов — своим фоновым проходом (см. nativeChatPrefetch.ts), параллельно остальному.
    const chatItems = Array.isArray(chats) ? chats : (chats as { 'hydra:member'?: unknown[] } | undefined)?.['hydra:member'];
    if (Array.isArray(chatItems)) prefetchChatMessages(chatItems as Parameters<typeof prefetchChatMessages>[0]);
    await warm(`${API_ROUTES.FAVORITES_ME}?page=1&itemsPerPage=${pageSize}`);
    await warm(`${API_ROUTES.TICKETS_ME}?active=true&page=1&itemsPerPage=${pageSize}`);
    await warm(API_ROUTES.USERS_ME);
    await warm(API_ROUTES.PROFILE_OAUTH_PROVIDERS, { locale: false });
    // Профиль показывается из кэша, только если есть и справочники (остальные прогревает preloadData).
    await getDistricts().catch(() => {});
    await getMyTechSupports().catch(() => {});
};

/** Публичное — и для гостей: форма и таблица обращений в ТП, юридические страницы. */
const prefetchPublic = async (): Promise<void> => {
    await getAppealReasons(undefined, 'applicableTo=support').catch(() => {});
    await getAppealReasons().catch(() => {});
    // Юридические страницы — тем же ключом, что в Legal.tsx (язык i18next + тип документа).
    for (const type of ['privacy_policy', 'terms_of_use', 'public_offer', 'third_party']) {
        await getLegalDocuments(i18n.language, `type=${type}`).catch(() => {});
    }
};

const prefetchAll = async (): Promise<void> => {
    await prefetchPersonal();
    await prefetchPublic();
};

export function initNativePrefetch(): void {
    if (!Capacitor.isNativePlatform()) return;
    // Только что вошли (личных экранов в кэше ещё нет) — прогреваем сразу, не дожидаясь главной:
    // в чаты/избранное/профиль пойдут в ближайшие секунды, и первый заход тоже должен быть мгновенным.
    if (getAuthToken() && peekApi(chatsFirstPage(), { locale: false }) === undefined) {
        void prefetchAll();
        return;
    }
    window.addEventListener(APP_READY_EVENT, () => {
        setTimeout(() => { void prefetchAll(); }, START_DELAY_MS);
    }, { once: true });
}
