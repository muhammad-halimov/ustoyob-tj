# Быстрый старт: Утилиты транслитерации и перевода

## ✅ Что было реализовано

### 1. nameTranslator - Побуквенная транслитерация имен
Автоматически транслитерирует имена между русским, таджикским и английским языками.

**🆕 Обновлено: Умная транслитерация с автоопределением языка!**

**Примеры использования:**
```typescript
import { smartNameTranslator, detectNameLanguage, normalizeNameFormat } from './utils/textHelper';

// 🎉 НОВОЕ: Умная транслитерация (автоопределение исходного языка)
smartNameTranslator('Abuabdulloҳ Rӯdakӣ', 'eng'); 
// Автоопределяет: тадж. смешанный → нормализует → транслитерирует
// Результат: "Abuabdulloh Rudaki"

smartNameTranslator('Иван', 'eng'); 
// Автоопределяет: русский → транслитерирует
// Результат: "Ivan"

smartNameTranslator('John', 'ru');
// Автоопределяет: английский → транслитерирует
// Результат: "Джон"

// Определение языка вручную
detectNameLanguage('Abuabdulloҳ Rӯdakӣ'); // → 'tj' (таджикский)
detectNameLanguage('Иван'); // → 'ru' (русский)
detectNameLanguage('John'); // → 'eng' (английский)

// Нормализация смешанных форматов
normalizeNameFormat('Abuabdulloҳ Rӯdakӣ');
// → "Абуабдуллоҳ Рӯдакӣ" (чистая кириллица)
```

**Что такое смешанный формат?**
Это когда имя написано частично латиницей, частично кириллицей с таджикскими буквами:
- `Abuabdullo`**`ҳ`** `Rӯdak`**`ӣ`** ← латиница + **ҳ, ӯ, ӣ** (тадж. буквы)
- `Abul`**`қ`**`osim Firdavsi` ← латиница + **қ** (тадж. буква)

Функция автоматически распознает такие случаи и нормализует их перед транслитерацией!

### 2. ticketTranslator - Перевод текстов тикетов
Переводит описания и названия с кэшированием в localStorage.

**Примеры использования:**
```typescript
import { ticketTranslator, ticketTranslatorSync } from './utils/textHelper';

// Асинхронный перевод (с API)
const text = await ticketTranslator('Требуется специалист', 'ru', 'eng');

// Синхронный перевод (только из кэша)
const cachedText = ticketTranslatorSync('Требуется специалист', 'ru', 'eng');
```

### 3. React Hooks для автоматического перевода

#### useTranslatedName (обновлен!)
```typescript
import { useTranslatedName } from './hooks/useTranslatedName';

function UserCard({ userName }) {
    // 🎉 НОВОЕ: Без указания исходного языка!
    // Автоматически определяет язык и транслитерирует
    const translatedName = useTranslatedName(userName);
    return <div>{translatedName}</div>;
}

// Примеры:
// userName = "Abuabdulloҳ Rӯdakӣ" (смешанный) → автоопределение → транслитерация
// userName = "Иван" (русский) → автоопределение → транслитерация
// userName = "John" (английский) → автоопределение → транслитерация
```

#### useTranslatedText
```typescript
import { useTranslatedText } from './hooks/useTranslatedText';

function Description({ text }) {
    const translated = useTranslatedText(text, 'ru');
    return <p>{translated}</p>;
}
```

## 🎯 Где применено

✅ **Card** - транслитерация имени автора
✅ **Chat** - транслитерация имен собеседников
✅ **MainReviewsSection** - транслитерация имен в отзывах
✅ **Ticket** - транслитерация имен заказчиков и специалистов
✅ **Profile** - готово к интеграции

## 🔄 Автоматическая реакция на смену языка

Все компоненты автоматически обновляются при смене языка благодаря `useLanguageChange`:

```typescript
import { useLanguageChange } from './hooks/useLanguageChange';

function MyComponent() {
    useLanguageChange(() => {
        // Код выполнится при смене языка
        console.log('Язык изменился!');
    });
}
```

## 🚀 Как добавить в новый компонент

### Вариант 1: Использовать хук
```typescript
import { useTranslatedName } from '../hooks';

function NewComponent({ userName }) {
    const name = useTranslatedName(userName, 'ru');
    return <span>{name}</span>;
}
```

### Вариант 2: Использовать функцию напрямую
```typescript
import { useTranslation } from 'react-i18next';
import { nameTranslator } from '../utils/textHelper';

function NewComponent({ user }) {
    const { i18n } = useTranslation();
    
    const getFullName = (user) => {
        const currentLang = i18n.language;
        const firstName = nameTranslator(user.name, { from: 'ru', to: currentLang });
        const lastName = nameTranslator(user.surname, { from: 'ru', to: currentLang });
        return `${firstName} ${lastName}`;
    };
    
    return <div>{getFullName(user)}</div>;
}
```

## 📝 Интеграция с Google Translate API (опционально)

Для включения реального перевода через Google Translate API:

1. Установите библиотеку:
```bash
npm install @vitalets/google-translate-api
```

2. Обновите функцию в `src/utils/textHelper.ts`:
```typescript
import translate from '@vitalets/google-translate-api';

const translateTextFallback = async (
    text: string,
    from: TicketLanguage,
    to: TicketLanguage
): Promise<string> => {
    try {
        const result = await translate(text, { from, to });
        return result.text;
    } catch (error) {
        console.error('Translation API error:', error);
        return text;
    }
};
```

## 📚 Полная документация

См. файл `TRANSLATION_UTILS_GUIDE.md` для подробной документации.

## 🐛 Troubleshooting

### Имя не транслитерируется
- Проверьте, что передан правильный исходный язык (`from`)
- Убедитесь, что `i18n.language` установлен корректно

### Перевод не работает
- Проверьте консоль на наличие предупреждений
- Убедитесь, что API перевода интегрирован (по умолчанию возвращается оригинальный текст)
- Проверьте кэш в localStorage: `localStorage.getItem('ticketTranslationCache')`

### Компонент не обновляется при смене языка
- Убедитесь, что используется хук `useLanguageChange` или реактивный хук (`useTranslatedName`, `useTranslatedText`)
- Проверьте, что событие `languageChanged` срабатывает

## ✨ Примеры из проекта

### Chat.tsx
```typescript
const getTranslatedFullName = useCallback((user: ApiUser): string => {
    const firstName = user.name || '';
    const lastName = user.surname || '';
    const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
    
    const translatedFirstName = nameTranslator(firstName, { from: 'ru', to: currentLang });
    const translatedLastName = nameTranslator(lastName, { from: 'ru', to: currentLang });
    
    return `${translatedFirstName} ${translatedLastName}`.trim();
}, [i18n.language]);
```

### Card.tsx
```typescript
const translatedAuthor = useTranslatedName(author, 'ru');
```

## 🎉 Готово к использованию!

Все компоненты обновлены и готовы к работе. При смене языка имена будут автоматически транслитерироваться.
