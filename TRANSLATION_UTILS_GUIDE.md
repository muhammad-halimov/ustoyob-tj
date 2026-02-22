# Утилиты транслитерации и перевода

Этот проект включает две основные утилиты для работы с многоязычностью:
- **nameTranslator** - побуквенная транслитерация имен
- **ticketTranslator** - перевод описаний и названий тикетов

## 📝 nameTranslator

Функция для побуквенной транслитерации имен между русским, таджикским и английским языками.

**Теперь с поддержкой смешанных форматов!** 🎉

### Использование

```typescript
import { nameTranslator } from '../utils/textHelper';

// Транслитерация с русского на английский
const latinName = nameTranslator('Иван', { from: 'ru', to: 'eng' });
// Результат: "Ivan"

// Транслитерация с таджикского на английский
const tjName = nameTranslator('Ҳасан', { from: 'tj', to: 'eng' });
// Результат: "Hasan"

// Транслитерация с английского на русский
const cyrillicName = nameTranslator('John', { from: 'eng', to: 'ru' });
// Результат: "Джон"

// 🆕 СМЕШАННЫЙ ФОРМАТ (латиница + кириллица)
const mixedName = nameTranslator('Abuabdulloҳ Rӯdakӣ', { from: 'tj', to: 'eng' });
// Автоматически нормализует в "Абуабдуллоҳ Рӯдакӣ" → "Abuabdulloh Rudaki"

const firdavsi = nameTranslator('Abulқosim Firdavsi', { from: 'tj', to: 'ru' });
// "Абулқосим Фирдавси" → "Абулкосим Фирдавси"
```

### Работа со смешанными форматами

Иногда имена приходят в смешанном формате: **латиница + таджикские кириллические буквы**.

Примеры:
- `Abuabdulloҳ Rӯdakӣ` (Рудаки)
- `Abulқosim Firdavsi` (Фирдоуси)
- `Sadriddin Aynӣ` (Айни)

Функция автоматически **нормализует** такие имена перед транслитерацией:

```typescript
import { normalizeNameFormat } from '../utils/textHelper';

// Ручная нормализация (если нужна)
const normalized = normalizeNameFormat('Abuabdulloҳ Rӯdakӣ');
// Результат: "Абуабдуллоҳ Рӯдакӣ" (чистая кириллица)
```

### Поддерживаемые языки

- `'ru'` - Русский (кириллица)
- `'tj'` - Таджикский (кириллица с дополнительными буквами: ӣ, ӯ, қ, ғ, ҳ, ҷ)
- `'eng'` - Английский (латиница)

### Правила транслитерации

#### Русский → Английский
- а → a, б → b, в → v, г → g, д → d, е → e
- ж → zh, з → z, и → i, й → y, к → k, л → l
- м → m, н → n, о → o, п → p, р → r, с → s
- т → t, у → u, ф → f, х → kh, ц → ts, ч → ch
- ш → sh, щ → shch, ы → y, э → e, ю → yu, я → ya

#### Таджикский → Английский
Включает все русские правила плюс:
- ӣ → i, ӯ → u, қ → q, ғ → gh, ҳ → h, ҷ → j

## 🌍 ticketTranslator

Функция для перевода описаний и названий тикетов с кэшированием переводов в localStorage.

### Асинхронное использование

```typescript
import { ticketTranslator } from '../utils/textHelper';

// Перевод текста
const translatedText = await ticketTranslator(
    'Требуется мастер для ремонта',
    'ru',
    'eng'
);
```

### Синхронное использование (только кэш)

```typescript
import { ticketTranslatorSync } from '../utils/textHelper';

// Получить перевод из кэша (если есть)
const cachedTranslation = ticketTranslatorSync(
    'Требуется мастер для ремонта',
    'ru',
    'eng'
);
```

### Кэширование

Переводы автоматически кэшируются в localStorage под ключом `ticketTranslationCache`. При повторном запросе того же текста перевод берется из кэша, что ускоряет работу и снижает нагрузку на API.

### Интеграция с API перевода

В текущей реализации `ticketTranslator` возвращает оригинальный текст (заглушка). Для интеграции с реальным API перевода (например, Google Translate):

1. Установите библиотеку для перевода:
```bash
npm install @vitalets/google-translate-api
```

2. Обновите функцию `translateTextFallback` в `src/utils/textHelper.ts`:
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

## 🎣 React Hooks

### useTranslatedName

Хук для автоматической транслитерации имен при смене языка.

```typescript
import { useTranslatedName } from '../hooks/useTranslatedName';

function UserCard({ userName }) {
    // Имя автоматически транслитерируется при смене языка
    const translatedName = useTranslatedName(userName, 'ru');
    
    return <div>{translatedName}</div>;
}
```

### useTranslatedText

Хук для автоматического перевода текста при смене языка.

```typescript
import { useTranslatedText } from '../hooks/useTranslatedText';

function TicketDescription({ description }) {
    // Описание автоматически переводится при смене языка
    const translatedDescription = useTranslatedText(description, 'ru');
    
    return <p>{translatedDescription}</p>;
}
```

### useTranslatedTexts

Хук для пакетного перевода нескольких текстов.

```typescript
import { useTranslatedTexts } from '../hooks/useTranslatedText';

function TicketCard({ ticket }) {
    const { title, description, isTranslating } = useTranslatedTexts(
        {
            title: ticket.title,
            description: ticket.description
        },
        'ru'
    );
    
    return (
        <div>
            {isTranslating && <LoadingSpinner />}
            <h3>{title}</h3>
            <p>{description}</p>
        </div>
    );
}
```

## 🔄 Интеграция с useLanguageChange

Все хуки автоматически реагируют на смену языка через `useLanguageChange`. При изменении языка приложения:

1. Хуки получают событие `languageChanged`
2. Автоматически запускается транслитерация/перевод
3. Компонент перерендеривается с новыми данными

```typescript
import { useLanguageChange } from '../hooks/useLanguageChange';

function MyComponent() {
    const [data, setData] = useState(null);
    
    // Автоматическая перезагрузка данных при смене языка
    useLanguageChange(() => {
        fetchData();
    });
    
    return <div>{/* контент */}</div>;
}
```

## 📦 Примеры использования в проекте

### TicketCard
```typescript
// Транслитерация имени автора
const translatedAuthor = useTranslatedName(author, 'ru');
```

### Chat
```typescript
// Вспомогательная функция для транслитерации полного имени
const getTranslatedFullName = useCallback((user: ApiUser): string => {
    const firstName = user.name || '';
    const lastName = user.surname || '';
    const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
    
    const translatedFirstName = nameTranslator(firstName, { from: 'ru', to: currentLang });
    const translatedLastName = nameTranslator(lastName, { from: 'ru', to: currentLang });
    
    return `${translatedFirstName} ${translatedLastName}`.trim();
}, [i18n.language]);
```

### MainReviewsSection & Ticket
```typescript
// Функция для получения имени клиента с транслитерацией
const getClientName = (review: any): string => {
    const client = review.client;
    if (!client) return 'Клиент';
    
    if (!client.name && !client.surname) {
        return client.login || 'Клиент';
    }
    
    const currentLang = i18n.language as 'ru' | 'tj' | 'eng';
    const firstName = client.name || '';
    const lastName = client.surname || '';
    
    const translatedFirstName = nameTranslator(firstName, { from: 'ru', to: currentLang });
    const translatedLastName = nameTranslator(lastName, { from: 'ru', to: currentLang });
    
    return `${translatedFirstName} ${translatedLastName}`.trim();
};
```

## 🚀 Будущие улучшения

1. **Интеграция с Google Cloud Translation API** для более точного перевода текстов
2. **Расширение карт транслитерации** для других языков
3. **Оптимизация кэширования** - добавить TTL и очистку старых переводов
4. **Offline-режим** для работы без подключения к интернету
5. **Предзагрузка переводов** для часто используемых текстов

## 📄 Файлы

- `src/utils/textHelper.ts` - Основные утилиты
- `src/hooks/useTranslatedName.ts` - Хук для транслитерации имен
- `src/hooks/useTranslatedText.ts` - Хуки для перевода текстов
- `src/hooks/useLanguageChange.ts` - Хук для отслеживания смены языка
- `src/hooks/index.ts` - Экспорт всех хуков

## 🤝 Contributing

При добавлении новых языков или улучшении алгоритмов транслитерации, пожалуйста, обновите:
1. Карты транслитерации в `textHelper.ts`
2. Типы `NameLanguage` и `TicketLanguage`
3. Документацию в этом файле
