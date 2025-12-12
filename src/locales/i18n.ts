import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './languages/en/common.json';
import enHeader from './languages/en/header.json';
import enSearch from './languages/en/search.json';
import enButtons from './languages/en/buttons.json';

import ruCommon from './languages/ru/common.json';
import ruHeader from './languages/ru/header.json';
import ruSearch from './languages/ru/search.json';
import ruButtons from './languages/ru/buttons.json';

import tjCommon from './languages/tj/common.json';
import tjHeader from './languages/tj/header.json';
import tjSearch from './languages/tj/search.json';
import tjButtons from './languages/tj/buttons.json';

import enCities from './languages/en/cities.json';
import ruCities from './languages/ru/cities.json';
import tjCities from './languages/tj/cities.json';

export type Language = 'tj' | 'ru' | 'en';

export const changeLanguage = (lang: Language) => {
    i18n.changeLanguage(lang);
    // localStorage.setItem('i18nextLng', lang);
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: {
                common: enCommon,
                header: enHeader,
                search: enSearch,
                buttons: enButtons,
                cities: enCities,
            },
            ru: {
                common: ruCommon,
                header: ruHeader,
                search: ruSearch,
                buttons: ruButtons,
                cities: ruCities,
            },
            tj: {
                common: tjCommon,
                header: tjHeader,
                search: tjSearch,
                buttons: tjButtons,
                cities: tjCities,
            },
        },
        fallbackLng: 'ru',
        lng: localStorage.getItem('i18nextLng') || 'ru',
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false,
        },
        ns: ['common', 'header', 'search', 'buttons'],
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