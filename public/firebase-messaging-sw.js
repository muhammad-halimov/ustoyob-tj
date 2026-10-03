/*
 * Service worker push-уведомлений сайта (Firebase Cloud Messaging) — см. src/utils/webPush.ts.
 *
 * Конфиг веб-приложения Firebase приходит в адресе воркера (?apiKey=…&projectId=…): сюда не доходят
 * переменные Vite, а регистрирует воркер сам сайт, уже зная их.
 *
 * Уведомление показывает Firebase, когда открытых видимых вкладок сайта нет (вкладка в фоне или сайт
 * закрыт); нажатие открывает страницу чата (webpush.fcm_options.link, его задаёт бэкенд). Пока сайт на
 * экране, уведомление не показывается: новое сообщение и так видно.
 */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');

const config = Object.fromEntries(new URL(self.location.href).searchParams);

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
    firebase.initializeApp(config);
    firebase.messaging();
}
