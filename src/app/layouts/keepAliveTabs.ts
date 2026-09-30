import type { ReactElement } from 'react';
import { Capacitor } from '@capacitor/core';
import { ROUTES } from '../routers/routes';

/** Keep-alive вкладок включён только в нативной (Capacitor) сборке — см. TabKeepAlive.tsx. */
export const KEEP_ALIVE = Capacitor.isNativePlatform();

/** Вкладки нижней навигации (точные пути; /profile/:id и остальное — обычные роуты через Outlet). */
export const TAB_PATHS: string[] = [ROUTES.HOME, ROUTES.FAVORITES, ROUTES.CHATS, ROUTES.PROFILE];

const normalize = (pathname: string): string =>
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

export const findTab = (pathname: string): string | null =>
    TAB_PATHS.find(p => p === normalize(pathname)) ?? null;

/** Элемент роута вкладки: в нативной сборке страницу рисует TabKeepAlive, сам роут — пустой. */
export const tabElement = (page: ReactElement): ReactElement | null => (KEEP_ALIVE ? null : page);

/** true, если по этому пути страницу ведёт TabKeepAlive (Layout не трогает её прокрутку). */
export const isKeepAliveTab = (pathname: string): boolean => KEEP_ALIVE && findTab(pathname) !== null;
