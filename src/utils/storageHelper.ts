// utils/storageHelper.ts - Unified localStorage management

const isClientSide = (): boolean => typeof window !== 'undefined';

/**
 * Safe localStorage value getter
 */
export const getStorageItem = (key: string): string | null => 
    isClientSide() ? localStorage.getItem(key) : null;

/**
 * Safe localStorage value setter
 */
export const setStorageItem = (key: string, value: string): void => {
    if (isClientSide()) localStorage.setItem(key, value);
};

/**
 * Safe localStorage value remover
 */
export const removeStorageItem = (key: string): void => {
    if (isClientSide()) localStorage.removeItem(key);
};

/**
 * Remove multiple localStorage items at once
 */
export const removeStorageItems = (...keys: string[]): void => {
    if (isClientSide()) keys.forEach(key => localStorage.removeItem(key));
};

/**
 * Parse JSON from localStorage with error handling
 */
export const getStorageJSON = <T,>(key: string): T | null => {
    const item = getStorageItem(key);
    if (!item) return null;
    try {
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return null;
    }
};

/**
 * Store JSON in localStorage with error handling
 */
export const setStorageJSON = <T,>(key: string, value: T): void => {
    try {
        setStorageItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error stringifying localStorage key "${key}":`, error);
    }
};

/**
 * Get boolean from localStorage
 */
export const getStorageBoolean = (key: string, defaultValue: boolean = false): boolean => {
    const item = getStorageItem(key);
    if (item === null) return defaultValue;
    return item === 'true';
};

/**
 * Set boolean in localStorage
 */
export const setStorageBoolean = (key: string, value: boolean): void => {
    setStorageItem(key, value ? 'true' : 'false');
};

/**
 * Clear all localStorage (use with caution!)
 */
export const clearAllStorage = (): void => {
    if (isClientSide()) localStorage.clear();
};
