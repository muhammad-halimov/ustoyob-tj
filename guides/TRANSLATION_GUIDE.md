# 🌍 Полное руководство по многоязычности

## Структура переводов

```
src/locales/
├── i18n.ts                    # Конфигурация i18next
├── languages/
│   ├── ru/                    # Русский
│   │   ├── common.json       # Основные переводы
│   │   ├── components.json   # Переводы компонентов
│   │   ├── header.json       # Header переводы
│   │   ├── search.json       # Search переводы
│   │   ├── buttons.json      # Button переводы
│   │   ├── cities.json       # City переводы
│   │   └── category.json     # Category переводы
│   ├── eng/                  # Английский
│   └── tj/                   # Таджикский
```

## Добавленные файлы переводов

### `components.json` - Полный список ключей

Содержит переводы для всех компонентов:

```json
{
  "app": {
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    ...
  },
  "buttons": {
    "showMore": "Показать все",
    "hideMore": "Свернуть",
    "addFavorite": "Добавить в избранное",
    "sending": "Отправка...",
    "saving": "Сохранение...",
    ...
  },
  "statuses": {
    "active": "Активно",
    "inactive": "Неактивно",
    "completed": "Завершено",
    ...
  },
  "roles": {
    "client": "заказчик",
    "master": "специалист",
    ...
  },
  "messages": {
    "authRequired": "Пожалуйста, авторизуйтесь.",
    "noDescription": "Описание отсутствует",
    ...
  },
  "reviews": {
    "sendReview": "Отправить отзыв",
    "showAllReviews": "Показать все отзывы",
    ...
  },
  "search": {
    "searchPlaceholder": "Поиск...",
    ...
  },
  "languages": {
    "tj": "Таджикский",
    "ru": "Русский",
    "eng": "Английский"
  }
}
```

## Как использовать переводы в компонентах

### 1. Простой текст

**ДО (hard-coded):**
```tsx
function MyComponent() {
    return <button>Сохранить</button>;
}
```

**ПОСЛЕ (с переводами):**
```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t } = useTranslation();
    return <button>{t('components:buttons.save')}</button>;
}
```

### 2. Условные тексты

**ДО:**
```tsx
<span>{isActive ? 'Активно' : 'Неактивно'}</span>
```

**ПОСЛЕ:**
```tsx
const { t } = useTranslation();
<span>{isActive ? t('components:statuses.active') : t('components:statuses.inactive')}</span>
```

### 3. Состояния кнопок

**ДО:**
```tsx
<button>{isLoading ? 'Отправка...' : 'Отправить'}</button>
```

**ПОСЛЕ:**
```tsx
const { t } = useTranslation();
<button>{isLoading ? t('components:buttons.sending') : t('components:buttons.submit')}</button>
```

## Ключи переводов по категориям

### Кнопки (`buttons.*`)
- `save` - Сохранить
- `cancel` - Отмена
- `delete` - Удалить
- `submit` - Отправить
- `sending` - Отправка...
- `saving` - Сохранение...
- `publishing` - Публикация...
- `showMore` - Показать все
- `hideMore` - Свернуть
- `expand` - Раскрыть
- `collapse` - Свернуть
- `archive` - Архивировать чат
- `restore` - Восстановить из архива
- `addFavorite` - Добавить в избранное
- `removeFavorite` - Удалить из избранного

### Статусы (`statuses.*`)
- `active` - Активно
- `inactive` - Неактивно
- `completed` - Завершено
- `activated` - активировано
- `deactivated` - деактивировано
- `approved` - одобрено
- `notApproved` - не одобрено
- `graduated` - (окончил)
- `notGraduated` - (не окончил)

### Сообщения (`messages.*`)
- `authRequired` - Пожалуйста, авторизуйтесь.
- `noDescription` - Описание отсутствует
- `noMasterInfo` - Нет информации о специалисте
- `activateSuccess` - Успешно активировано
- `deactivateSuccess` - Успешно деактивировано
- `activateError` - Ошибка при активации
- `deactivateError` - Ошибка при деактивации

### Роли (`roles.*`)
- `specialist` - специалист
- `client` - заказчик
- `master` - специалист
- `customers` - Заказчики
- `customersDesc` - Описание для заказчиков
- `masters` - Специалисты
- `mastersDesc` - Описание для специалистов

### Формы (`forms.*`)
- `gender` - Пол
- `mainPhone` - Основной номер
- `additionalPhone` - Дополнительный номер
- `aboutYou` - О себе
- `messageFieldPlaceholder` - Введите сообщение

### Время (`time.*`)
- `justNow` - только что
- `minuteAgo` - минуту назад
- `hourAgo` - час назад
- `dayAgo` - день назад
- `recentlyAgo` - недавно

## Реактивное обновление при смене языка

Используйте hook `useLanguageChange`:

```tsx
import { useLanguageChange } from '../../hooks/useLanguageChange';
import { useTranslation } from 'react-i18next';

function MyComponent() {
    const { t } = useTranslation();
    
    // Обновляет компонент при смене языка
    useLanguageChange(() => {
        console.log('Язык изменен на:', t('components:languages.' + i18n.language));
    });
    
    return (
        <div>
            <h1>{t('components:buttons.save')}</h1>
        </div>
    );
}
```

## Примеры из реальных компонентов

### Category.tsx

```tsx
import { useTranslation } from 'react-i18next';

function Category() {
    const { t } = useTranslation();
    // ...
    
    return (
        <div>
            {isLoading && <p>{t('components:app.loading')}</p>}
            {tickets.length === 0 && <p>{t('components:app.noData')}</p>}
            <button>{t('components:buttons.updateBtn')}</button>
        </div>
    );
}
```

### Время ago (minutes, hours, days)

```tsx
const formatTimeAgo = (dateString: string): string => {
    const { t } = useTranslation();
    const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('components:time.justNow');
    if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${t('components:time.minutesAgo')}`;
    }
    if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${t('components:time.hoursAgo')}`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${t('components:time.daysAgo')}`;
};
```

## Чеклист для полного перевода

- [ ] Header.tsx - языки и навигация
- [ ] Main.tsx - роли и описания
- [ ] Category.tsx - кнопки и статусы
- [ ] MyTickets.tsx - кнопки, статусы, время
- [ ] Services/EditService.tsx - кнопки формы
- [ ] Auth modal - кнопки авторизации
- [ ] ClientProfile/MasterProfile - все кнопки и статусы
- [ ] Chat.tsx - статусы и плейсхолдеры
- [ ] Favorites.tsx - кнопки и статусы
- [ ] Order.tsx - кнопки и статусы
- [ ] Search.tsx - плейсхолдеры и сообщения

## Совет

Используйте переводы не только для текста, но и для:
- `title` атрибутов
- `aria-label` атрибутов
- `placeholder` атрибутов
- Сообщений об ошибках
- Уведомлений

Пример:
```tsx
<button 
    title={t('components:buttons.addFavorite')}
    aria-label={t('components:buttons.addFavorite')}
>
    ❤️
</button>
```

