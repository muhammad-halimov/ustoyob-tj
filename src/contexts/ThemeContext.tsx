import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStorageItem, setStorageItem } from '../utils/storageHelper';

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
    // Инициализация темы из localStorage или системных настроек
    const [theme, setThemeState] = useState<Theme>(() => {
        // Сначала проверяем localStorage
        const savedTheme = getStorageItem('theme') as Theme;
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }

        // Если нет сохраненной темы, проверяем системные настройки
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        return 'light'; // По умолчанию светлая тема
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

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// Слушаем изменения системной темы
if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Эта функция будет вызываться только если пользователь не установил предпочтение вручную
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const savedTheme = getStorageItem('theme');
        // Применяем системную тему только если пользователь не сохранил собственное предпочтение
        if (!savedTheme) {
            document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
        }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
}