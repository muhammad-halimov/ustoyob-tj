import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketTranslator, ticketTranslatorSync } from '../utils/textHelper';

type TextLanguage = 'ru' | 'tj' | 'eng';

/**
 * Хук для автоматического перевода текста при смене языка
 * @param originalText - Оригинальный текст
 * @param sourceLanguage - Исходный язык текста (по умолчанию 'ru')
 * @param useSync - Использовать синхронную версию (только кэш)
 * @returns Переведенный текст в соответствии с текущим языком
 */
export const useTranslatedText = (
    originalText: string,
    sourceLanguage: TextLanguage = 'ru',
    useSync: boolean = false
): string => {
    const { i18n } = useTranslation();
    const [translatedText, setTranslatedText] = useState(originalText);

    useEffect(() => {
        if (!originalText) {
            setTranslatedText('');
            return;
        }

        const currentLanguage = i18n.language as TextLanguage;

        // Если используем синхронную версию или языки совпадают
        if (useSync || sourceLanguage === currentLanguage) {
            const translated = ticketTranslatorSync(originalText, sourceLanguage, currentLanguage);
            setTranslatedText(translated);
            return;
        }

        // Асинхронный перевод
        const translateAsync = async () => {
            try {
                const translated = await ticketTranslator(originalText, sourceLanguage, currentLanguage);
                setTranslatedText(translated);
            } catch (error) {
                console.error('Translation error in hook:', error);
                setTranslatedText(originalText);
            }
        };

        translateAsync();
    }, [originalText, sourceLanguage, i18n.language, useSync]);

    return translatedText;
};

/**
 * Хук для пакетного перевода нескольких текстов
 * @param texts - Массив объектов с текстами для перевода
 * @param sourceLanguage - Исходный язык текстов
 * @returns Объект с переведенными текстами
 */
export const useTranslatedTexts = <T extends Record<string, string>>(
    texts: T,
    sourceLanguage: TextLanguage = 'ru'
): T & { isTranslating: boolean } => {
    const { i18n } = useTranslation();
    const [translatedTexts, setTranslatedTexts] = useState<T>(texts);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        const currentLanguage = i18n.language as TextLanguage;

        if (sourceLanguage === currentLanguage) {
            setTranslatedTexts(texts);
            return;
        }

        const translateAll = async () => {
            setIsTranslating(true);
            try {
                const entries = Object.entries(texts);
                const translatedEntries = await Promise.all(
                    entries.map(async ([key, value]) => {
                        const translated = await ticketTranslator(value, sourceLanguage, currentLanguage);
                        return [key, translated];
                    })
                );

                const result = Object.fromEntries(translatedEntries) as T;
                setTranslatedTexts(result);
            } catch (error) {
                console.error('Batch translation error:', error);
                setTranslatedTexts(texts);
            } finally {
                setIsTranslating(false);
            }
        };

        translateAll();
    }, [texts, sourceLanguage, i18n.language]);

    return { ...translatedTexts, isTranslating };
};
