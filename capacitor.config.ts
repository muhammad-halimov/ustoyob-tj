import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tj.ustoyob.app',
  appName: 'Ustoyob',
  webDir: 'dist',
  ios: {
    // По умолчанию у Capacitor `never`: веб-вью рисуется от самого края экрана, а без
    // `viewport-fit=cover` в index.html `env(safe-area-inset-*)` равен 0 — поэтому шапка (логотип)
    // уходила под статус-бар / Dynamic Island, а нижняя навигация упиралась в скруглённые углы
    // и «домашнюю полоску». `always` сдвигает контент внутрь безопасной зоны нативно, не трогая
    // общие стили сайта (они одни и те же для веба и приложения).
    contentInset: 'always',
  },
};

export default config;
