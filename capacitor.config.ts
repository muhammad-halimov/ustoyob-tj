import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tj.ustoyob.app',
  appName: 'ustoyob.tj',
  webDir: 'dist',
  ios: {
    // `never` (значение Capacitor по умолчанию, указано явно): веб-вью на весь экран, под статус-баром
    // и «домашней полоской». Безопасные зоны обрабатываются в CSS через env(safe-area-inset-*) —
    // src/app/styles/native.scss + utils/nativeChrome.ts (там же добавляется viewport-fit=cover).
    // Так фон страницы везде остаётся цветом текущей темы. Вариант `always` (сдвиг веб-вью нативно)
    // оставляет по краям полосы системного цвета и не давал предсказуемо поднять нижнюю панель.
    contentInset: 'never',
  },

};

export default config;
