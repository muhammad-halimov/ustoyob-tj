// ─── Локализованное форматирование дат ────────────────────────────────────────

/** Formats a date string to 'DD.MM.YYYY' (ru-RU locale). Falls back to today's date when absent or invalid. */
export const getFormattedDate = (dateString?: string): string => {
    if (dateString) {
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch {
            // fall through to default
        }
    }
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${day}.${month}.${year}`;
};

/**
 * Formats a date string using i18n month names from the `components:time.months` key.
 * Returns the date as "D Month YYYY" (e.g. "5 января 2024").
 * Falls back gracefully if the date is invalid or already contains translated month names.
 */
export const formatLocalizedDate = (dateString: string, t: any): string => {
    try {
        if (!dateString) return t('ticket:dateNotSpecified');
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const hasTranslatedMonth = /\b(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр|january|february|march|april|may|june|july|august|september|october|november|december|декабри|январи|феврали|марти|апрели|маи|июни|июли|августи|сентябри|октябри|ноябри)\w*/i.test(dateString);
        if (hasTranslatedMonth) return dateString;
        const months = t('components:time.months', { returnObjects: true }) as string[] || [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch {
        return dateString;
    }
};

/**
 * Returns a human-readable "time ago" string using i18n keys from the `components:time` namespace.
 * E.g. "только что", "5 минут назад", "2 дня назад".
 */
export const getTimeAgo = (dateString: string, t: any): string => {
    try {
        if (!dateString) return t('components:time.recentlyAgo');
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.warn('Invalid date passed to getTimeAgo:', dateString);
            return t('components:time.recentlyAgo');
        }
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 0) return t('components:time.justNow');
        if (diffInSeconds < 60) return t('components:time.justNow');
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            if (minutes === 1) return t('components:time.minuteAgo');
            if (minutes < 5) return t('components:time.minutesAgo', { count: minutes });
            return t('components:time.minutesPluralAgo', { count: minutes });
        }
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            if (hours === 1) return t('components:time.hourAgo');
            if (hours < 5) return t('components:time.hoursAgo', { count: hours });
            return t('components:time.hoursPluralAgo', { count: hours });
        }
        const days = Math.floor(diffInSeconds / 86400);
        if (days === 1) return t('components:time.dayAgo');
        if (days < 5) return t('components:time.daysAgo', { count: days });
        return t('components:time.daysPluralAgo', { count: days });
    } catch (error) {
        console.warn('Error in getTimeAgo:', error, 'for date:', dateString);
        return t('components:time.recentlyAgo');
    }
};
