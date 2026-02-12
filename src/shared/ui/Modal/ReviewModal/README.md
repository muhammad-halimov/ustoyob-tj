# ReviewModal Component

Универсальный компонент для отправки отзывов о работе с рейтингом, комментарием и фотографиями.

## Использование

```tsx
import ReviewModal from '../../../shared/ui/ReviewModal';

// В компоненте
const [showReviewModal, setShowReviewModal] = useState(false);
const [modalMessage, setModalMessage] = useState('');
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [showErrorModal, setShowErrorModal] = useState(false);
const [reviewCount, setReviewCount] = useState<number>(0);

const handleCloseReviewModal = () => {
    setShowReviewModal(false);
};

const handleReviewSuccess = (message: string) => {
    setModalMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 3000);
};

const handleReviewError = (message: string) => {
    setModalMessage(message);
    setShowErrorModal(true);
    setTimeout(() => setShowErrorModal(false), 3000);
};

const handleReviewSubmitted = (updatedCount: number) => {
    setReviewCount(updatedCount);
};

// Рендер
<ReviewModal
    isOpen={showReviewModal}
    onClose={handleCloseReviewModal}
    onSuccess={handleReviewSuccess}
    onError={handleReviewError}
    ticketId={order?.id || 0}
    targetUserId={order?.authorId || 0}
    onReviewSubmitted={handleReviewSubmitted}
/>
```

## Параметры (Props)

### Обязательные

- `isOpen`: `boolean` - открыта ли модалка
- `onClose`: `() => void` - функция закрытия модалки
- `onSuccess`: `(message: string) => void` - коллбэк при успешной отправке отзыва
- `onError`: `(message: string) => void` - коллбэк при ошибке отправки
- `ticketId`: `number` - ID тикета для которого оставляется отзыв
- `targetUserId`: `number` - ID пользователя, которому оставляется отзыв

### Опциональные

- `onReviewSubmitted`: `(reviewCount: number) => void` - коллбэк после успешной отправки (получает обновленное количество отзывов)

## Функциональность

### Внутреннее состояние

Компонент самостоятельно управляет состоянием:
- Текст отзыва (`reviewText`)
- Выбранное количество звезд (`selectedStars` от 1 до 5)
- Загруженные фотографии (`reviewPhotos`)
- Состояние отправки (`isSubmitting`)

### Валидация

Компонент автоматически валидирует:
- Наличие текста комментария
- Выбор рейтинга (минимум 1 звезда)
- Проверка что пользователь не оставляет отзыв самому себе

### API запросы

Компонент самостоятельно выполняет:
1. Получение текущего пользователя (`getCurrentUserId`)
2. Отправку отзыва на API (`POST /api/reviews`)
3. Загрузку фотографий (если есть) (`POST /api/reviews/{id}/upload-photo`)
4. Подсчет отзывов целевого пользователя (`fetchReviewCount`)

### Логика отзывов

Автоматически определяет тип отзыва на основе роли пользователя:
- **Мастер** → оставляет отзыв клиенту (type: 'client')
- **Клиент** → оставляет отзыв мастеру (type: 'master')

## Примеры использования

### Базовое использование

```tsx
<ReviewModal
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    onSuccess={(msg) => alert(msg)}
    onError={(msg) => alert(msg)}
    ticketId={123}
    targetUserId={456}
/>
```

### С обработкой успеха через StatusModal

```tsx
const handleReviewSuccess = (message: string) => {
    setModalMessage(message);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 3000);
};

<ReviewModal
    isOpen={showReviewModal}
    onClose={() => setShowReviewModal(false)}
    onSuccess={handleReviewSuccess}
    onError={handleReviewError}
    ticketId={order.id}
    targetUserId={order.authorId}
/>

<StatusModal
    type="success"
    isOpen={showSuccessModal}
    onClose={() => setShowSuccessModal(false)}
    message={modalMessage}
/>
```

### С обновлением счётчика отзывов

```tsx
<ReviewModal
    isOpen={showReviewModal}
    onClose={() => setShowReviewModal(false)}
    onSuccess={handleReviewSuccess}
    onError={handleReviewError}
    ticketId={order.id}
    targetUserId={order.authorId}
    onReviewSubmitted={(count) => {
        console.log(`Всего отзывов: ${count}`);
        setReviewCount(count);
    }}
/>
```

## UI элементы

### Поля ввода
- **Текстовое поле** - для комментария о работе
- **Рейтинг** - 5 звёзд (интерактивные)
- **Загрузка фото** - множественная загрузка изображений с превью

### Кнопки
- **Закрыть** - закрывает модалку без отправки
- **Отправить** - валидирует и отправляет отзыв (отключается во время отправки)

## Состояния загрузки

Компонент автоматически блокирует интерфейс во время отправки:
- Текстовое поле становится `disabled`
- Кнопки становятся `disabled`
- Звезды рейтинга становятся `disabled`
- Кнопка удаления фото становится `disabled`
- Текст кнопки меняется на "Отправка..."

## Зависимости

Компонент требует:
- `getAuthToken()` из `utils/auth.ts`
- `getUserRole()` из `utils/auth.ts`
- `VITE_API_BASE_URL` из environment variables

## API эндпоинты

Используемые эндпоинты:
- `GET /api/users/me` - получение текущего пользователя
- `POST /api/reviews` - создание отзыва
- `POST /api/reviews/{id}/upload-photo` - загрузка фотографий
- `GET /api/reviews?master={id}` - подсчет отзывов пользователя

## Стилизация

Компонент использует CSS модули (`ReviewModal.module.scss`):
- Адаптивный дизайн (мобильная версия для экранов < 768px)
- Анимация появления (slideIn)
- Hover эффекты на интерактивные элементы
- Дизайн кнопок и полей соответствует общему стилю приложения

## Особенности

1. **Автономность** - компонент полностью самодостаточен, не требует внешнего управления состоянием форматион
2. **Валидация** - встроенная валидация всех полей
3. **Error handling** - обработка различных типов ошибок API (422, 400, 404, 403)
4. **Оптимизация** - загрузка фотографий происходит после создания отзыва, если отзыв не создался - фото не загружаются
5. **UX** - автоматическое закрытие модалки после успешной отправки
6. **Доступность** - поддержка клавиатурной навигации и click вне модалки для закрытия
