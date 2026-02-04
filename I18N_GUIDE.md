# Реактивная многоязычность - Руководство

## Обзор

Сайт поддерживает три языка: **Таджикский (tj)**, **Русский (ru)**, **Английский (eng)**.

Перевод происходит **реактивно** - при смене языка компоненты автоматически перерендеривается без перезагрузки страницы.

## Как это работает

### 1. Система i18n (i18next)

- **Файл конфигурации**: `src/locales/i18n.ts`
- **Файлы переводов**: 
  - `src/locales/languages/ru/` (русский)
  - `src/locales/languages/eng/` (английский)
  - `src/locales/languages/tj/` (таджикский)

### 2. Смена языка

В `Header.tsx` при клике на язык вызывается:

```tsx
const handleLanguageChange = (langCode: Language) => {
    changeLanguage(langCode);
    setShowLangDropdown(false);

    // Диспетчит событие для перерендера компонентов
    setTimeout(() => {
        window.dispatchEvent(new Event('languageChanged'));
    }, 100);
};
```

### 3. Реактивность компонентов

Новый custom hook `useLanguageChange()` подписывает компоненты на изменение языка:

```tsx
import { useLanguageChange } from '../../hooks/useLanguageChange';

function MyComponent() {
    useLanguageChange(() => {
        // Код, который выполнится при смене языка
        // Например, переполучить данные с новым locale параметром
        fetchDataWithLocale();
    });
    
    // ...
}
```

### 4. API запросы с локализацией

Все API запросы теперь включают параметр `?locale=`:

```tsx
const locale = localStorage.getItem('i18nextLng') || 'ru';
const response = await fetch(`${API_BASE_URL}/api/tickets?locale=${locale}`, {
    // ...
});
```

Поддерживаемые значения: `tj`, `ru`, `eng`

### 5. Использование переводов в компонентах

Используйте `useTranslation()` из react-i18next:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t } = useTranslation();
    
    return <h1>{t('app.name')}</h1>;
}
```

## Добавление новых переводов

1. Добавьте ключ в JSON файлы всех трех языков:

```json
// ru/common.json
{
  "myFeature": {
    "title": "Мой заголовок",
    "description": "Описание"
  }
}

// eng/common.json
{
  "myFeature": {
    "title": "My Title",
    "description": "Description"
  }
}

// tj/common.json
{
  "myFeature": {
    "title": "Сараваҳи ман",
    "description": "Шарҳ"
  }
}
```

2. Используйте в компоненте:

```tsx
const { t } = useTranslation();
t('myFeature.title'); // Вернет перевод на текущем языке
```

## Компоненты с реактивной локализацией

Следующие компоненты отслеживают смену языка и обновляют содержимое:

- ✅ **CategoryTicketsPage** - перезагружает название категории и тикеты
- ✅ **Recommendations** - перезагружает свежие объявления
- ✅ **Header** - использует react-i18next для всех текстов

## Хранение выбранного языка

Выбранный язык сохраняется в `localStorage` с ключом `i18nextLng`:

```tsx
localStorage.setItem('i18nextLng', language);
```

При перезагрузке страницы язык восстанавливается автоматически.

## Примечания

- Язык по умолчанию: **Русский (ru)**
- Язык автоматически обнаруживается из браузера (через i18next-browser-languagedetector)
- При смене языка события диспетчатся с задержкой 100ms для синхронизации

