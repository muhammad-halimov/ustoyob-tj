import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорты для английского языка
import enCommon from './languages/eng/common.json';
import enHeader from './languages/eng/header.json';
import enSearch from './languages/eng/search.json';
import enButtons from './languages/eng/buttons.json';
import enCities from './languages/eng/cities.json';
import enCategory from './languages/eng/category.json'; // Добавьте этот импорт

// Импорты для русского языка
import ruCommon from './languages/ru/common.json';
import ruHeader from './languages/ru/header.json';
import ruSearch from './languages/ru/search.json';
import ruButtons from './languages/ru/buttons.json';
import ruCities from './languages/ru/cities.json';
import ruCategory from './languages/ru/category.json'; // Добавьте этот импорт

// Импорты для таджикского языка
import tjCommon from './languages/tj/common.json';
import tjHeader from './languages/tj/header.json';
import tjSearch from './languages/tj/search.json';
import tjButtons from './languages/tj/buttons.json';
import tjCities from './languages/tj/cities.json';
import tjCategory from './languages/tj/category.json';

export type Language = 'tj' | 'ru' | 'eng';

export const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
};


i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            eng: {
                common: enCommon,
                header: enHeader,
                search: enSearch,
                buttons: enButtons,
                cities: enCities,
                category: enCategory,
            },
            ru: {
                common: ruCommon,
                header: ruHeader,
                search: ruSearch,
                buttons: ruButtons,
                cities: ruCities,
                category: ruCategory,
            },
            tj: {
                common: tjCommon,
                header: tjHeader,
                search: tjSearch,
                buttons: tjButtons,
                cities: tjCities,
                category: tjCategory,
            },
        },
        fallbackLng: 'ru',
        lng: localStorage.getItem('i18nextLng') || 'ru',
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false,
        },
        ns: ['common', 'header', 'search', 'buttons', 'cities', 'category'],
        defaultNS: 'common',
        react: {
            useSuspense: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
    });

export default i18n;