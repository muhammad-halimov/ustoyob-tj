/**
 * Центральная точка для предзагрузки данных приложения
 * Гарантирует что cities и occupations загружаются один раз при старте
 * и обновляются только при смене языка
 */

import { preloadData, clearCache } from './dataCache';
import { useLanguageChange } from '../hooks/useLanguageChange';
import { useEffect } from 'react';

/**
 * Hook для инициализации кеширования данных
 * Используется в корневом компоненте приложения
 */
export const useDataCacheInit = () => {
    // Предзагружаем данные при монтировании
    useEffect(() => {
        preloadData();
    }, []);

    // Очищаем кеш и перезагружаем данные при смене языка
    useLanguageChange(() => {
        console.log('Language changed, clearing cache and reloading data...');
        clearCache();
        // Небольшая задержка для избежания race conditions
        setTimeout(() => {
            preloadData();
        }, 100);
    });
};

/**
 * Инициализирует кеширование данных в main приложении
 * Вызывается один раз при старте приложения
 */
export const initDataCache = () => {
    console.log('Initializing data cache...');
    
    // Слушаем события смены языка на уровне окна
    window.addEventListener('languageChanged', () => {
        console.log('Global language change detected, clearing cache...');
        clearCache();
        setTimeout(() => {
            preloadData();
        }, 100);
    });

    // Предзагружаем данные
    preloadData();
};