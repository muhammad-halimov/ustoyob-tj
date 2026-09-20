/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStorageItem, setStorageItem, removeStorageItems } from '../utils/storageUtils';
import { syncStatusBar } from '../utils/nativeChrome';

/**
 * ThemeContext — provides light/dark theme state to the whole component tree.
 *
 * - Until the user manually picks a theme (via `setTheme`/`toggleTheme`, e.g. the
 *   ThemeToggle widget), the app follows the OS-level theme (`prefers-color-scheme`)
 *   and updates live if the user flips dark mode in system settings while the app is
 *   open — on both Android WebView and iOS WKWebView this tracks the real system
 *   setting, so no native code is needed for this to work on either platform.
 * - A manual pick is a TEMPORARY override, not a permanent opt-out of syncing: it is stored
 *   together with the system theme that was active when it was made ('themeOverrideBase'),
 *   and stops applying the moment the system theme changes — from then on the app follows the
 *   system again. Without this, a single tap on the toggle killed system syncing for good
 *   (there is no UI to return to "follow system"), which read as "theme sync doesn't work".
 *   The pick is persisted to localStorage ('themeOverride' key). Deliberately a NEW key, not
 *   the old 'theme' one: earlier builds wrote
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

/** A manual theme pick and the system theme that was active when it was made. */
interface ThemeOverride {
    value: Theme;
    base: Theme;
}

const readStoredOverride = (): ThemeOverride | null => {
    const saved = getStorageItem('themeOverride');
    if (saved !== 'light' && saved !== 'dark') return null;
    const base = getStorageItem('themeOverrideBase');
    // Выбор, сохранённый до появления 'themeOverrideBase', считаем сделанным при текущей теме системы.
    return { value: saved, base: base === 'light' || base === 'dark' ? base : getSystemTheme() };
};

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    // Ручной выбор пользователя + системная тема на момент выбора (см. шапку файла).
    const [override, setOverride] = useState<ThemeOverride | null>(readStoredOverride);

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

    // Ручной выбор действует, только пока системная тема та же, что была при выборе.
    const overrideStillValid = override !== null && override.base === systemTheme;
    const theme: Theme = overrideStillValid ? override.value : systemTheme;

    // Системная тема сменилась — ручной выбор отработал своё, снова следуем системе.
    useEffect(() => {
        if (override !== null && !overrideStillValid) {
            setOverride(null);
            removeStorageItems('themeOverride', 'themeOverrideBase');
        }
    }, [override, overrideStillValid]);

    // Применяем тему к документу
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);

        // Обновляем метатег для цвета статус-бара в мобильных браузерах
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
        }

        // Приложение: цвет часов/индикаторов статус-бара — под тему приложения (см. nativeChrome.ts).
        syncStatusBar(theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setOverride({ value: newTheme, base: systemTheme });
        // Выбор живёт, пока системная тема не изменится (см. шапку файла).
        setStorageItem('themeOverride', newTheme);
        setStorageItem('themeOverrideBase', systemTheme);
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
