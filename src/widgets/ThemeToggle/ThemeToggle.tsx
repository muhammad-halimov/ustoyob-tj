import React from 'react';
import { useTheme } from '../../contexts';
import styles from './ThemeToggle.module.scss';

interface ThemeToggleProps {
    className?: string;
    showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
    className = '', 
    showLabel = false 
}) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <div className={`${styles.themeToggle} ${className}`}>
            {showLabel && (
                <span className={styles.label}>
                    {theme === 'light' ? 'Светлая тема' : 'Темная тема'}
                </span>
            )}
            
            <button 
                onClick={toggleTheme}
                className={styles.toggleButton}
                aria-label={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
                title={`Переключить на ${theme === 'light' ? 'темную' : 'светлую'} тему`}
            >
                <div className={`${styles.toggleTrack} ${theme === 'dark' ? styles.dark : ''}`}>
                    <div className={styles.toggleThumb}>
                        <div className={styles.iconContainer}>
                            {theme === 'light' ? (
                                // Иконка солнца
                                <svg 
                                    className={styles.sunIcon} 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 24" 
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            ) : (
                                // Иконка луны
                                <svg 
                                    className={styles.moonIcon} 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 24" 
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
            </button>
        </div>
    );
};