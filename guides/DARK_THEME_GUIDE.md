# Темная тема

## Описание

В приложении реализована поддержка светлой и темной темы с автоматическим переключением в зависимости от системных настроек пользователя.

## Основные компоненты

### 1. ThemeContext (`src/contexts/ThemeContext.tsx`)

Главный контекст для управления темой, который предоставляет:

- `theme` - текущая тема ('light' | 'dark')
- `toggleTheme()` - переключение между темами
- `setTheme(theme)` - установка конкретной темы

### 2. ThemeToggle (`src/widgets/ThemeToggle/`)

Компонент переключателя темы с анимированной кнопкой. Особенности:

- Красивая анимация при переключении
- Иконки солнца/луны
- Адаптивный дизайн для мобильных устройств
- Поддержка accessibility (ARIA labels)

### 3. CSS переменные (`src/app/styles/_variables.scss`)

Система CSS custom properties для автоматического переключения цветов:

```scss
:root[data-theme="light"] {
  --color-background-primary: #ffffff;
  --color-text-primary: #1A1A1A;
  // ... другие цвета
}

:root[data-theme="dark"] {
  --color-background-primary: #2A2A2A;
  --color-text-primary: #E5E5E5;
  // ... другие цвета
}
```

## Использование

### В компонентах

```tsx
import { useTheme } from '../../contexts';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Текущая тема: {theme}</p>
      <button onClick={toggleTheme}>
        Переключить тему
      </button>
    </div>
  );
}
```

### В стилях

Используйте CSS переменные вместо жестко заданных цветов:

```scss
.myComponent {
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-stroke);
}
```

### Добавление ThemeToggle

```tsx
import { ThemeToggle } from '../ThemeToggle';

<ThemeToggle 
  showLabel={true} // опционально показать текст
  className="my-toggle-class" 
/>
```

## Автоматические настройки

### 1. Системная тема

При первом запуске приложение автоматически определяет предпочтительную тему пользователя через `prefers-color-scheme`:

```javascript
window.matchMedia('(prefers-color-scheme: dark)').matches
```

### 2. Сохранение выбора

Выбранная пользователем тема сохраняется в `localStorage` и загружается при следующем запуске приложения.

### 3. Meta-теги

Для мобильных браузеров автоматически обновляется `meta[name="theme-color"]`:
- Светлая тема: `#ffffff`
- Темная тема: `#1a1a1a`

## Цветовая схема

### Светлая тема
- Фон: белый (#ffffff)
- Текст: темно-серый (#1A1A1A)
- Акцент: синий (#3A54DA)

### Темная тема
- Фон: темно-серый (#2A2A2A)
- Текст: светло-серый (#E5E5E5)
- Акцент: светло-синий (#5A6BDE)

## Совместимость

- ✅ Все современные браузеры
- ✅ Мобильные устройства
- ✅ Системные настройки
- ✅ Accessibility стандарты
- ✅ Плавные анимации переходов

## Пример интеграции в новый компонент

```tsx
// MyNewComponent.tsx
import React from 'react';
import { useTheme } from '../../contexts';
import styles from './MyNewComponent.module.scss';

export const MyNewComponent = () => {
  const { theme } = useTheme();
  
  return (
    <div className={styles.container} data-theme={theme}>
      <h2>Мой компонент</h2>
      <p>Этот компонент поддерживает темную тему!</p>
    </div>
  );
};
```

```scss
// MyNewComponent.module.scss
.container {
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  padding: 20px;
  border: 1px solid var(--color-stroke);
  border-radius: 8px;
  transition: var(--theme-transition);
  
  h2 {
    color: var(--color-text-black);
    margin-bottom: 12px;
  }
  
  p {
    color: var(--color-text-gray);
  }
}
```