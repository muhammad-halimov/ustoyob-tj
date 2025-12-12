import i18n from './i18n';

// Хелперы для удобства использования
export const t = i18n.t.bind(i18n);

export const getCurrentLanguage = (): string => {
    return i18n.language || 'ru';
};

export const getAvailableLanguages = () => {
    return [
        { code: 'tj', name: 'Тоҷикӣ', nativeName: 'ТҶ' },
        { code: 'ru', name: 'Русский', nativeName: 'РУ' },
        { code: 'en', name: 'English', nativeName: 'EN' },
    ];
};

export { changeLanguage } from './i18n';