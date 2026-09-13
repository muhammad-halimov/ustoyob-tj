import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { smartNameTranslator, ticketTranslator, ticketTranslatorSync } from '../utils/textUtils';
import type { Language } from '../types/common';

/**
 * Base hook: re-runs `transform` whenever `input` or the active i18n language changes.
 * Sync transforms compute the initial value immediately (no flash).
 * Async transforms discard stale results if input/language changes before they resolve.
 */
export function useLangTransform<T>(
    input: T,
    transform: (input: T, lang: string) => T | Promise<T>,
): T {
    const { i18n } = useTranslation();
    const transformRef = useRef(transform);
    transformRef.current = transform;

    const [result, setResult] = useState<T>(() => {
        if (!input) return input;
        const out = transformRef.current(input, i18n.language);
        return out instanceof Promise ? input : out;
    });

    useEffect(() => {
        if (!input) { setResult(input); return; }
        const out = transformRef.current(input, i18n.language);
        if (out instanceof Promise) {
            let cancelled = false;
            out
                .then(r  => { if (!cancelled) setResult(r); })
                .catch(() => { if (!cancelled) setResult(input); });
            return () => { cancelled = true; };
        } else {
            setResult(out);
        }
    }, [input, i18n.language]);

    return result;
}

/** Transliterates a person's name reactively when the UI language changes. */
export const useTranslatedName = (originalName: string): string =>
    useLangTransform(originalName, (name, lang) => smartNameTranslator(name, lang as Language));

/** Translates ticket text (title, description) reactively when the UI language changes. */
export const useTranslatedText = (
    originalText: string,
    sourceLanguage: Language = 'ru',
    useSync = false,
): string =>
    useLangTransform(originalText, (text, lang) => {
        const target = lang as Language;
        if (useSync || sourceLanguage === target)
            return ticketTranslatorSync(text, sourceLanguage, target);
        return ticketTranslator(text, sourceLanguage, target);
    }
);