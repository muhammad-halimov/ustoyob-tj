/**
 * Push-уведомления сайта в браузере (Firebase Cloud Messaging, Web Push). Бэкенд шлёт их на новое сообщение
 * в чате и на новый отклик на объявление — те же, что получает мобильное приложение (README бэкенда →
 * «Push-уведомления»). В мобильном приложении (Capacitor) не работает: там свои, нативные (nativePush.ts).
 *
 *  - Разрешение браузер даёт спросить только по нажатию — его спрашивает плашка PushPrompt (enableWebPush).
 *    Дальше браузер регистрируется на сервере сам: при открытии сайта и после входа, если разрешение уже есть.
 *  - Выход из аккаунта — браузер отписывается: уведомления прошлого пользователя сюда больше не приходят.
 *  - Показывает уведомления service worker (public/firebase-messaging-sw.js), когда сайт не на экране;
 *    нажатие открывает чат.
 *
 * Нужен конфиг веб-приложения Firebase и ключ VAPID (VITE_FIREBASE_*, см. README). Без них — выключено:
 * плашки нет, ничего не грузится. Сам Firebase SDK подгружается только когда нужен.
 */
import { Capacitor } from '@capacitor/core';
import i18n from 'i18next';
import { API_ROUTES } from '../app/routers/routes';
import { universalApiRequest } from './apiUtils';
import { getAuthToken } from './authUtils';
import { getStorageItem, removeStorageItems, setStorageItem } from './storageUtils';

const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/** Последний токен, зарегистрированный на сервере, — чтобы отписать браузер при выходе. */
const TOKEN_KEY = 'webPushToken';
/** Отдельный scope, как у Firebase по умолчанию, — не мешает другим service worker'ам сайта. */
const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

const configured = (): boolean =>
    !!(config.apiKey && config.projectId && config.messagingSenderId && config.appId && VAPID_KEY);

let supported: Promise<boolean> | null = null;
/** Можно ли включить уведомления в этом браузере (и настроен ли Firebase). */
export const webPushSupported = (): Promise<boolean> => {
    if (!supported) {
        supported = (async () => {
            if (Capacitor.isNativePlatform() || !configured()) return false;
            if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
            const { isSupported } = await import('firebase/messaging');
            return isSupported();
        })().catch(() => false);
    }
    return supported;
};

export const webPushPermission = (): NotificationPermission =>
    'Notification' in window ? Notification.permission : 'denied';

const messaging = async () => {
    const [{ initializeApp, getApps }, { getMessaging }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
    return getMessaging(getApps()[0] ?? initializeApp(config));
};

const register = async (): Promise<void> => {
    if (!getAuthToken() || webPushPermission() !== 'granted' || !(await webPushSupported())) return;
    const { getToken } = await import('firebase/messaging');
    const params = new URLSearchParams(Object.entries(config).filter((e): e is [string, string] => !!e[1]));
    const serviceWorkerRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, { scope: SW_SCOPE });
    const token = await getToken(await messaging(), { vapidKey: VAPID_KEY, serviceWorkerRegistration });
    if (!token) return;
    await universalApiRequest(API_ROUTES.DEVICE_TOKENS, {
        method: 'POST',
        body: { token, platform: 'web', locale: i18n.language },
        locale: false,
    });
    setStorageItem(TOKEN_KEY, token);
};

const syncRegistration = (): void => {
    register().catch(err => console.warn('Push: браузер не зарегистрирован', err));
};

/** Нажали «Включить» на плашке: спросить разрешение и подписать браузер. true — уведомления включены. */
export const enableWebPush = async (): Promise<boolean> => {
    if (!(await webPushSupported())) return false;
    const permission = webPushPermission() === 'default' ? await Notification.requestPermission() : webPushPermission();
    if (permission !== 'granted') return false;
    try {
        await register();
        return true;
    } catch (err) {
        console.warn('Push: браузер не зарегистрирован', err);
        return false;
    }
};

const unregister = (): void => {
    const token = getStorageItem(TOKEN_KEY);
    if (!token) return;
    removeStorageItems(TOKEN_KEY);
    universalApiRequest(API_ROUTES.DEVICE_TOKENS_UNREGISTER, {
        method: 'POST',
        body: { token },
        requiresAuth: false,
        locale: false,
    }).catch(() => {});
    // Сам токен браузера тоже сбрасываем: следующий вошедший получит новый, не связанный с прошлым.
    messaging().then(m => import('firebase/messaging').then(({ deleteToken }) => deleteToken(m))).catch(() => {});
};

export function initWebPush(): void {
    void webPushSupported().then((ok) => {
        if (!ok) return;
        syncRegistration();
        window.addEventListener('login', syncRegistration);
        window.addEventListener('languageChanged', syncRegistration);
        window.addEventListener('authCleared', unregister);
    });
}
