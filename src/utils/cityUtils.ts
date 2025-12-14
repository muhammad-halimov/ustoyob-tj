/**
 * Функция для получения перевода города на текущем языке
 */
export const getCityTranslation = (cityName: string, t: (key: string) => string): string => {
    if (!cityName) return '';

    const translation = t(`cities:${cityName}`);

    // Если перевод не найден (вернулся ключ), возвращаем оригинальное название
    if (translation === `cities:${cityName}`) {
        return cityName;
    }

    return translation;
};

/**
 * Функция для сохранения выбранного города
 */
export const saveSelectedCity = (cityName: string): void => {
    localStorage.setItem('selectedCity', cityName);
};

/**
 * Функция для получения выбранного города
 */
export const getSelectedCity = (): string | null => {
    return localStorage.getItem('selectedCity');
};

/**
 * Функция для форматирования названия города (первая буква заглавная)
 */
export const formatCityName = (cityName: string): string => {
    if (!cityName) return '';
    return cityName.charAt(0).toUpperCase() + cityName.slice(1);
};