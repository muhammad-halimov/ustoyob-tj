/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storageUtils';

/**
 * ThemeContext — provides light/dark theme state to the whole component tree.
 *
 * - Until the user manually picks a theme (via `setTheme`/`toggleTheme`, e.g. the
 *   ThemeToggle widget), the app follows the OS-level theme (`prefers-color-scheme`)
 *   and updates live if the user flips dark mode in system settings while the app is
 *   open — on both Android WebView and iOS WKWebView this tracks the real system
 *   setting, so no native code is needed for this to work on either platform.
 * - Once the user manually picks a theme, that explicit choice is persisted to
 *   localStorage ('themeOverride' key) and takes priority over the system theme from
 *   then on. Deliberately a NEW key, not the old 'theme' one: earlier builds wrote
 *   the resolved theme to 'theme' unconditionally on every mount (not just on a real
 *   user choice), so any device that had an older build installed already carries a
 *   stale value there that would otherwise permanently masquerade as an explicit
 *   override and make system-following look broken.
 * - `change` events on the `prefers-color-scheme` media query can be missed while the
 *   WebView's renderer is frozen in the background — some Android skins suspend
 *   background app JS more aggressively than stock/AOSP, which is exactly the
 *   "works on stock Android, not on other skins" symptom this is meant to cover.
 *   To compensate, the system theme is re-read from scratch whenever the app becomes
 *   visible again (`visibilitychange`), not just via the live listener.
 * - The active theme is written to `data-theme` on `<html>` so SCSS variables
 *   can switch via CSS custom properties (see _variables.scss).
 * - The `theme-color` meta tag is updated for mobile status-bar colour.
 */
export type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/** Reads the OS-level theme preference. Defaults to 'dark' when matchMedia isn't available. */
const getSystemTheme = (): Theme =>
    typeof window !== 'undefined' && window.matchMedia
        ? (window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light')
        : 'dark';

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    // Явный выбор пользователя, если он когда-либо переключал тему вручную.
    const [override, setOverride] = useState<Theme | null>(() => {
        const saved = getStorageItem('themeOverride');
        return saved === 'light' || saved === 'dark' ? saved : null;
    });

    // Текущая системная тема — отслеживается живьём, пока нет явного override.
    const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;

        const mql = window.matchMedia(DARK_MEDIA_QUERY);
        const handleChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
        // Догоняем реальное состояние на случай пропущенного `change` (см. комментарий
        // в шапке файла) — при каждом возврате приложения на передний план.
        const resync = () => {
            if (document.visibilityState === 'visible') setSystemTheme(getSystemTheme());
        };

        mql.addEventListener('change', handleChange);
        document.addEventListener('visibilitychange', resync);
        window.addEventListener('pageshow', resync);
        return () => {
            mql.removeEventListener('change', handleChange);
            document.removeEventListener('visibilitychange', resync);
            window.removeEventListener('pageshow', resync);
        };
    }, []);

    const theme: Theme = override ?? systemTheme;

    // Применяем тему к документу
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Обновляем метатег для цвета статус-бара в мобильных браузерах
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setOverride(newTheme);
        // Сохраняем выбор в localStorage — с этого момента системную тему больше не слушаем.
        setStorageItem('themeOverride', newTheme);
    };

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const value: ThemeContextType = {
        theme,
        toggleTheme,
        setTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

/** Returns the theme context. Must be used inside <ThemeProvider>. */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
