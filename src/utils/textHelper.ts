import { getStorageJSON, setStorageJSON } from './storageHelper';

// ============================================================================
// Transliteration Maps
// ============================================================================

// Карты транслитерации для русского языка (включая таджикские буквы для совместимости)
const RU_TO_EN_MAP: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Shch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya',
    // Таджикские буквы (для совместимости)
    'ӣ': 'i', 'ӯ': 'u', 'қ': 'q', 'ғ': 'gh', 'ҳ': 'h', 'ҷ': 'j',
    'Ӣ': 'I', 'Ӯ': 'U', 'Қ': 'Q', 'Ғ': 'Gh', 'Ҳ': 'H', 'Ҷ': 'J'
};

// Карты транслитерации для таджикского языка (с дополнительными буквами)
const TJ_TO_EN_MAP: Record<string, string> = {
    ...RU_TO_EN_MAP,
    'ӣ': 'i', 'ӯ': 'u', 'қ': 'q', 'ғ': 'gh', 'ҳ': 'h', 'ҷ': 'j',
    'Ӣ': 'I', 'Ӯ': 'U', 'Қ': 'Q', 'Ғ': 'Gh', 'Ҳ': 'H', 'Ҷ': 'J'
};

// Обратная карта EN -> RU (для простых случаев)
const EN_TO_RU_MAP: Record<string, string> = {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
    'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м',
    'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
    'f': 'ф', 'kh': 'х', 'ts': 'ц', 'ch': 'ч', 'sh': 'ш', 'shch': 'щ',
    'yu': 'ю', 'ya': 'я',
    // Таджикские специальные звуки заменяем русскими аналогами
    'q': 'к', 'gh': 'г', 'h': 'х', 'j': 'дж'
};

// Обратная карта EN -> TJ (с правильными таджикскими буквами)
const EN_TO_TJ_MAP: Record<string, string> = {
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
    'zh': 'ж', 'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м',
    'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т', 'u': 'у',
    'f': 'ф', 'ts': 'ц', 'sh': 'ш', 'shch': 'щ',
    'yu': 'ю', 'ya': 'я',
    // Таджикские специфические звуки
    'q': 'қ', 'gh': 'ғ', 'h': 'ҳ', 'j': 'ҷ',
    'kh': 'х', 'ch': 'ч'
};

// ============================================================================
// Name Translator (побуквенная транслитерация имен)
// ============================================================================

type NameLanguage = 'ru' | 'tj' | 'eng';

interface NameTranslatorOptions {
    from: NameLanguage;
    to: NameLanguage;
}

/**
 * Нормализует смешанные форматы (латиница + кириллица) в чистую кириллицу
 * Например: "Abuabdulloҳ Rӯdakӣ" → "Абуабдуллоҳ Рӯдакӣ"
 */
const normalizeMixedFormat = (text: string): string => {
    // Проверяем, есть ли и латиница, и кириллица
    const hasLatin = /[a-zA-Z]/.test(text);
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    
    if (!hasLatin || !hasCyrillic) {
        return text; // Не смешанный формат
    }
    
    // Транслитерируем латинские части в кириллицу, сохраняя таджикские буквы
    let result = '';
    let i = 0;
    
    while (i < text.length) {
        const char = text[i];
        
        // Сохраняем кириллические буквы (включая таджикские)
        if (/[\u0400-\u04FF]/.test(char)) {
            result += char;
            i++;
            continue;
        }
        
        // Сохраняем пробелы и пунктуацию
        if (!/[a-zA-Z]/.test(char)) {
            result += char;
            i++;
            continue;
        }
        
        // Пытаемся найти двухбуквенные комбинации
        if (i + 1 < text.length) {
            const twoChars = (text[i] + text[i + 1]).toLowerCase();
            const mapping2: Record<string, string> = {
                'kh': 'х', 'ch': 'ч', 'sh': 'ш', 'zh': 'ж',
                'ts': 'ц', 'yu': 'ю', 'ya': 'я', 'yo': 'ё',
                'gh': 'г', // таджикская ғ транслитерируется в г для смешанных форматов
            };
            
            if (mapping2[twoChars]) {
                const mapped = mapping2[twoChars];
                // Сохраняем регистр первой буквы
                result += char === char.toUpperCase() ? mapped.toUpperCase() : mapped;
                i += 2;
                continue;
            }
        }
        
        // Проверяем трехбуквенные комбинации
        if (i + 2 < text.length) {
            const threeChars = (text[i] + text[i + 1] + text[i + 2]).toLowerCase();
            if (threeChars === 'shch') {
                const mapped = 'щ';
                result += char === char.toUpperCase() ? mapped.toUpperCase() : mapped;
                i += 4;
                continue;
            }
        }
        
        // Транслитерируем одиночные латинские буквы
        const lowerChar = char.toLowerCase();
        const mapping: Record<string, string> = {
            'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
            'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м',
            'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т',
            'u': 'у', 'f': 'ф', 'c': 'с', 'h': 'х', 'j': 'ж', 'w': 'в',
            'x': 'кс', 'q': 'к'
        };
        
        const mapped = mapping[lowerChar] || char;
        result += char === char.toUpperCase() ? mapped.toUpperCase() : mapped;
        i++;
    }
    
    return result;
};

/**
 * Транслитерация имен между русским, таджикским и английским языками
 * Автоматически обрабатывает смешанные форматы (латиница + кириллица)
 * @param name - Имя для транслитерации
 * @param options - Опции: from (исходный язык), to (целевой язык)
 * @returns Транслитерированное имя
 */
export const nameTranslator = (name: string, options: NameTranslatorOptions): string => {
    if (!name) return '';
    
    const { from, to } = options;
    
    // Если языки совпадают, возвращаем как есть
    if (from === to) return name;
    
    // Нормализуем смешанные форматы в кириллицу
    let normalizedName = name;
    if (from === 'tj' && /[a-zA-Z]/.test(name) && /[\u0400-\u04FF]/.test(name)) {
        normalizedName = normalizeMixedFormat(name);
    }
    
    // Выбираем карту транслитерации
    let translitMap: Record<string, string> = {};
    
    if (from === 'ru' && to === 'eng') {
        translitMap = RU_TO_EN_MAP;
    } else if (from === 'tj' && to === 'eng') {
        translitMap = TJ_TO_EN_MAP;
    } else if (from === 'eng' && to === 'ru') {
        translitMap = EN_TO_RU_MAP;
    } else if (from === 'eng' && to === 'tj') {
        translitMap = EN_TO_TJ_MAP;
    } else if (from === 'ru' && to === 'tj') {
        // Транслитерация RU -> TJ (через английский)
        return nameTranslator(nameTranslator(normalizedName, { from: 'ru', to: 'eng' }), { from: 'eng', to: 'tj' });
    } else if (from === 'tj' && to === 'ru') {
        // Транслитерация TJ -> RU (через английский)
        return nameTranslator(nameTranslator(normalizedName, { from: 'tj', to: 'eng' }), { from: 'eng', to: 'ru' });
    }
    
    // Побуквенная транслитерация
    let result = '';
    let i = 0;
    
    while (i < normalizedName.length) {
        // Пытаемся найти совпадение для 2-4 символов (для комбинаций типа 'shch', 'kh')
        let found = false;
        
        for (let len = 4; len >= 1; len--) {
            const substr = normalizedName.substring(i, i + len);
            const lowerSubstr = substr.toLowerCase();
            
            if (translitMap[lowerSubstr]) {
                // Сохраняем регистр первой буквы
                const translitValue = translitMap[lowerSubstr];
                if (substr[0] === substr[0].toUpperCase() && translitValue) {
                    result += translitValue.charAt(0).toUpperCase() + translitValue.slice(1);
                } else {
                    result += translitValue;
                }
                i += len;
                found = true;
                break;
            } else if (translitMap[substr]) {
                result += translitMap[substr];
                i += len;
                found = true;
                break;
            }
        }
        
        // Если не нашли в карте, оставляем символ как есть
        if (!found) {
            result += normalizedName[i];
            i++;
        }
    }
    
    return result;
};

/**
 * Вспомогательная функция для обработки смешанных форматов
 * Автоматически определяет формат и нормализует имя
 * @param name - Имя в любом формате
 * @returns Нормализованное имя в кириллице (если был смешанный формат)
 */
export const normalizeNameFormat = (name: string): string => {
    if (!name) return '';
    
    // Проверяем смешанный формат
    const hasLatin = /[a-zA-Z]/.test(name);
    const hasCyrillic = /[\u0400-\u04FF]/.test(name);
    
    if (hasLatin && hasCyrillic) {
        return normalizeMixedFormat(name);
    }
    
    return name;
};

/**
 * Автоматически определяет язык текста
 * @param text - Текст для анализа
 * @returns Определенный язык: 'ru', 'tj' или 'eng'
 */
export const detectNameLanguage = (text: string): NameLanguage => {
    if (!text) return 'ru';
    
    // Проверяем наличие специфических таджикских букв
    const hasTajikChars = /[ӣӯқғҳҷӢӮҚҒҲҶ]/.test(text);
    if (hasTajikChars) return 'tj';
    
    // Проверяем наличие любой кириллицы
    const hasCyrillic = /[\u0400-\u04FF]/.test(text);
    const hasLatin = /[a-zA-Z]/.test(text);
    
    // Смешанный формат считаем таджикским
    if (hasCyrillic && hasLatin) return 'tj';
    
    // Только кириллица - русский
    if (hasCyrillic && !hasLatin) return 'ru';
    
    // Только латиница - английский
    if (hasLatin && !hasCyrillic) return 'eng';
    
    // По умолчанию русский
    return 'ru';
};

/**
 * Умная транслитерация с автоматическим определением исходного языка
 * @param name - Имя в любом формате
 * @param targetLanguage - Целевой язык ('ru', 'tj' или 'eng')
 * @returns Транслитерированное имя
 */
export const smartNameTranslator = (name: string, targetLanguage: NameLanguage): string => {
    if (!name) return '';
    
    // Автоматически определяем исходный язык
    const sourceLanguage = detectNameLanguage(name);
    
    // Если языки совпадают, просто нормализуем (на случай смешанного формата)
    if (sourceLanguage === targetLanguage) {
        return normalizeNameFormat(name);
    }
    
    // Транслитерируем
    return nameTranslator(name, { from: sourceLanguage, to: targetLanguage });
};

// ============================================================================
// Ticket Translator (перевод описаний и названий тикетов)
// ============================================================================

type TicketLanguage = 'ru' | 'tj' | 'eng';

interface TranslationCache {
    [key: string]: {
        [lang: string]: string;
    };
}

const TRANSLATION_CACHE_KEY = 'ticketTranslationCache';

/**
 * Получить кэш переводов из localStorage
 */
const getTranslationCache = (): TranslationCache => {
    return getStorageJSON<TranslationCache>(TRANSLATION_CACHE_KEY) || {};
};

/**
 * Сохранить кэш переводов в localStorage
 */
const setTranslationCache = (cache: TranslationCache): void => {
    setStorageJSON(TRANSLATION_CACHE_KEY, cache);
};

/**
 * Создать уникальный ключ для кэша
 */
const getCacheKey = (text: string, from: TicketLanguage): string => {
    return `${from}:${text.substring(0, 100)}`; // Ограничиваем длину ключа
};

/**
 * Простой перевод текста через встроенный словарь (заглушка)
 * В будущем можно заменить на реальный API Google Translate
 */
const translateTextFallback = async (text: string, from: TicketLanguage, to: TicketLanguage): Promise<string> => {
    // Заглушка: возвращаем оригинальный текст
    // TODO: Интегрировать Google Translate API или другой сервис перевода
    console.warn(`Translation API not implemented. Returning original text. From: ${from}, To: ${to}`);
    return text;
};

/**
 * Перевод описаний и названий тикетов с кэшированием
 * @param text - Текст для перевода
 * @param from - Исходный язык
 * @param to - Целевой язык
 * @returns Promise с переведенным текстом
 */
export const ticketTranslator = async (
    text: string,
    from: TicketLanguage,
    to: TicketLanguage
): Promise<string> => {
    if (!text || text.trim() === '') return '';
    
    // Если языки совпадают, возвращаем как есть
    if (from === to) return text;
    
    // Проверяем кэш
    const cache = getTranslationCache();
    const cacheKey = getCacheKey(text, from);
    
    if (cache[cacheKey] && cache[cacheKey][to]) {
        console.log('Translation found in cache');
        return cache[cacheKey][to];
    }
    
    try {
        // Выполняем перевод (пока заглушка)
        const translatedText = await translateTextFallback(text, from, to);
        
        // Сохраняем в кэш
        if (!cache[cacheKey]) {
            cache[cacheKey] = {};
        }
        cache[cacheKey][to] = translatedText;
        setTranslationCache(cache);
        
        return translatedText;
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Возвращаем оригинал при ошибке
    }
};

/**
 * Синхронная версия ticketTranslator для случаев, когда нужен немедленный результат
 * Использует только кэш
 */
export const ticketTranslatorSync = (
    text: string,
    from: TicketLanguage,
    to: TicketLanguage
): string => {
    if (!text || text.trim() === '' || from === to) return text;
    
    const cache = getTranslationCache();
    const cacheKey = getCacheKey(text, from);
    
    return cache[cacheKey]?.[to] || text;
};

// ============================================================================
// Existing Helper Functions
// ============================================================================

export const truncateText = (text: string, maxLength: number = 110): string => {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...';
    }
    return text;
};

export const textHelper = (text: string): string => {
    if (!text) return '';

    // 1. Заменяем HTML-сущности на обычные символы
    let cleaned = text
        .replace(/&nbsp;/g, ' ')          // неразрывный пробел
        .replace(/&amp;/g, '&')           // амперсанд
        .replace(/&lt;/g, '<')            // меньше
        .replace(/&gt;/g, '>')            // больше
        .replace(/&quot;/g, '"')          // двойная кавычка
        .replace(/&#039;/g, "'")          // одинарная кавычка
        .replace(/&hellip;/g, '...')      // многоточие
        .replace(/&mdash;/g, '—')         // тире
        .replace(/&laquo;/g, '«')         // левая кавычка
        .replace(/&raquo;/g, '»');        // правая кавычка

    // 2. Удаляем все остальные HTML-сущности (общий паттерн)
    cleaned = cleaned.replace(/&[a-z]+;/g, ' ');

    // 3. Удаляем HTML-теги (если есть)
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // 4. Убираем лишние пробелы и переносы строк
    cleaned = cleaned
        .replace(/\s+/g, ' ')             // множественные пробелы -> один пробел
        .replace(/\n\s*\n/g, '\n')        // множественные пустые строки -> одна
        .trim();                          // убираем пробелы в начале и конце

    return cleaned;
};