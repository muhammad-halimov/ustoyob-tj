import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { smartNameTranslator } from '../utils/textHelper';

type NameLanguage = 'ru' | 'tj' | 'eng';

/**
 * Хук для автоматической транслитерации имен при смене языка
 * Автоматически определяет исходный язык имени
 * @param originalName - Оригинальное имя (в любом формате)
 * @returns Транслитерированное имя в соответствии с текущим языком
 */
export const useTranslatedName = (originalName: string): string => {
    const { i18n } = useTranslation();
    const [translatedName, setTranslatedName] = useState(originalName);

    useEffect(() => {
        if (!originalName) {
            setTranslatedName('');
            return;
        }

        const currentLanguage = i18n.language as NameLanguage;
        
        // Используем умную транслитерацию с автоопределением языка
        const translated = smartNameTranslator(originalName, currentLanguage);

        setTranslatedName(translated);
    }, [originalName, i18n.language]);

    return translatedName;
};
