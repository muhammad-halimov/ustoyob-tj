export const cleanText = (text: string): string => {
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