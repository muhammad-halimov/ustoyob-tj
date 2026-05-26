import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storageHelper';

/**
 * ThemeContext — provides light/dark theme state to the whole component tree.
 *
 * - Initial theme is read from localStorage ('theme' key).
 *   Defaults to 'dark' when no value is stored.
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

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    // Инициализация темы из localStorage, по умолчанию светлая тема
    const [theme, setThemeState] = useState<Theme>(() => {
        // Проверяем localStorage
        const savedTheme = getStorageItem('theme') as Theme;
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }

        // Если нет сохраненной темы, используем тёмную тему
        return 'dark';
    });

    // Применяем тему к документу
    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        
        // Сохраняем выбор в localStorage
        setStorageItem('theme', theme);
        
        // Обновляем метатег для цвета статус-бара в мобильных браузерах
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
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