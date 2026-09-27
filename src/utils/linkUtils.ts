import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Открывает внешнюю ссылку (соцсети, произвольные URL).
 *
 * В нативном приложении обычный `<a target="_blank">` / `window.open()` выкидывает
 * пользователя из приложения в системный Safari/Chrome — так же, как это было с OAuth
 * (см. mobileOAuth.ts). Вместо этого используем `@capacitor/browser`
 * (SFSafariViewController / Chrome Custom Tabs) — та же вкладка поверх приложения,
 * пользователь не покидает контекст.
 *
 * В вебе — обычное поведение через window.open в новой вкладке.
 */
export const openExternalLink = async (url: string): Promise<void> => {
    if (!url || url === '#') return;

    if (Capacitor.isNativePlatform()) {
        try {
            await Browser.open({ url });
            return;
        } catch {
            // падаем на обычное поведение ниже
        }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
};
