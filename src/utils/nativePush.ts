/**
 * Push-уведомления (Firebase Cloud Messaging) — только мобильная сборка. Бэкенд шлёт их на новое сообщение
 * в чате и на новый отклик на объявление (см. README бэкенда → «Push-уведомления»).
 *
 *  - Устройство регистрируется на сервере (`POST /api/device-tokens`) при запуске, если пользователь вошёл, и
 *    сразу после входа; разрешение на уведомления спрашивается тогда же, один раз. Сменили язык — устройство
 *    регистрируется заново: текст уведомлений приходит на языке приложения.
 *  - Выход из аккаунта — устройство отписывается (`POST /api/device-tokens/unregister`), чтобы уведомления
 *    прошлого пользователя сюда больше не приходили.
 *  - Нажали на уведомление — открывается его чат.
 *  - Пока приложение открыто, системные уведомления не показываются: новые сообщения и так видны в приложении
 *    (переписка и счётчики обновляются через Mercure).
 *
 * Без файлов Firebase (google-services.json / GoogleService-Info.plist) плагин не работает — регистрация
 * тихо не происходит, приложение работает как раньше.
 */
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import i18n from 'i18next';
import type { createBrowserRouter } from 'react-router-dom';
import { API_ROUTES, ROUTES } from '../app/routers/routes';
import { universalApiRequest } from './apiUtils';
import { getAuthToken } from './authUtils';
import { getStorageItem, removeStorageItems, setStorageItem } from './storageUtils';

type AppRouter = ReturnType<typeof createBrowserRouter>;

/** Последний токен, зарегистрированный на сервере, — чтобы отписать устройство при выходе. */
const TOKEN_KEY = 'pushToken';

const register = async (token: string): Promise<void> => {
    if (!getAuthToken()) return;
    await universalApiRequest(API_ROUTES.DEVICE_TOKENS, {
        method: 'POST',
        body: { token, platform: Capacitor.getPlatform(), locale: i18n.language },
        locale: false,
    });
    setStorageItem(TOKEN_KEY, token);
};

/**
 * Зарегистрировать устройство для уведомлений вошедшего пользователя. askPermission — спросить разрешение,
 * если его ещё не спрашивали (иначе — только если уже разрешено).
 */
const syncRegistration = async (askPermission: boolean): Promise<void> => {
    if (!getAuthToken()) return;
    try {
        let { receive } = await FirebaseMessaging.checkPermissions();
        if (receive !== 'granted' && askPermission && receive.startsWith('prompt')) {
            ({ receive } = await FirebaseMessaging.requestPermissions());
        }
        if (receive !== 'granted') return;
        const { token } = await FirebaseMessaging.getToken();
        if (token) await register(token);
    } catch (err) {
        // Firebase не настроен (нет google-services.json / GoogleService-Info.plist) или нет сети — без уведомлений.
        console.warn('Push: устройство не зарегистрировано', err);
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
};

export function installNativePush(router: AppRouter): void {
    if (!Capacitor.isNativePlatform()) return;

    // Нажали на уведомление (приложение было закрыто или в фоне) — открываем чат.
    FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
        const chatId = (notification.data as Record<string, unknown> | undefined)?.chatId;
        if (typeof chatId === 'string' && chatId) void router.navigate(`${ROUTES.CHATS}?chatId=${encodeURIComponent(chatId)}`);
    }).catch(() => {});
    // Firebase сменил токен устройства — сообщаем серверу новый.
    FirebaseMessaging.addListener('tokenReceived', ({ token }) => {
        if (token) register(token).catch(() => {});
    }).catch(() => {});

    // Android 8+: уведомления идут в канал, который бэкенд указывает по id (channel_id: messages).
    if (Capacitor.getPlatform() === 'android') {
        FirebaseMessaging.createChannel({
            id: 'messages',
            name: i18n.t('header:chats'),
            importance: 4,
            visibility: 1,
            vibration: true,
        }).catch(() => {});
    }

    void syncRegistration(true);
    window.addEventListener('login', () => { void syncRegistration(true); });
    window.addEventListener('authCleared', unregister);
    window.addEventListener('languageChanged', () => { void syncRegistration(false); });
}
