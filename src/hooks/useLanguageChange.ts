import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Hook для реактивного обновления компонента при смене языка
 * Автоматически перерендеривает компонент при смене языка без перезагрузки страницы
 */
export const useLanguageChange = (callback?: () => void) => {
    const { i18n } = useTranslation();

    useEffect(() => {
        const handleLanguageChange = () => {
            callback?.();
        };

        // Подписываемся на событие смены языка
        window.addEventListener('languageChanged', handleLanguageChange);
        
        // Также подписываемся на событие i18next (для надежности)
        i18n.on('languageChanged', handleLanguageChange);

        return () => {
            window.removeEventListener('languageChanged', handleLanguageChange);
            i18n.off('languageChanged', handleLanguageChange);
        };
    }, [i18n, callback]);

    return i18n.language;
};
