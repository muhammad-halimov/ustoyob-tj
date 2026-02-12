# StatusModal Component

Универсальный компонент для отображения модальных окон успеха, ошибки и информации.

## Использование

```tsx
import StatusModal from '../../../shared/ui/StatusModal';

// В компоненте
const [showModal, setShowModal] = useState(false);
const [message, setMessage] = useState('');

// Рендер
<StatusModal
    type="success"  // 'success' | 'error' | 'info'
    isOpen={showModal}
    onClose={() => setShowModal(false)}
    message="Операция выполнена успешно!"
    title="Успешно!"  // опционально (если не указано, используется дефолтный заголовок)
    buttonText="OK"   // опционально (по умолчанию "Понятно")
/>
```

## Параметры

- `type`: Тип модалки - 'success' | 'error' | 'info'
- `isOpen`: boolean - открыта ли модалка
- `onClose`: () => void - функция закрытия модалки
- `message`: string - текст сообщения
- `title?`: string - заголовок (опционально)
- `buttonText?`: string - текст кнопки (опционально, по умолчанию "Понятно")

## Примеры

### Success модалка
```tsx
<StatusModal
    type="success"
    isOpen={showSuccessModal}
    onClose={() => setShowSuccessModal(false)}
    message="Услуга успешно обновлена!"
/>
```

### Error модалка
```tsx
<StatusModal
    type="error"
    isOpen={showErrorModal}
    onClose={() => setShowErrorModal(false)}
    message="Произошла ошибка при сохранении данных"
/>
```

### Info модалка
```tsx
<StatusModal
    type="info"
    isOpen={showInfoModal}
    onClose={() => setShowInfoModal(false)}
    message="Ваш запрос обрабатывается"
/>
```

## Иконки

Компонент автоматически подставляет иконки:
- Success: `/uspeh.png`
- Error: `/error.png`
- Info: без иконки

Иконки должны находиться в папке `public/`.

## Стили

Цвета заголовков:
- Success: зеленый (#2e7d32)
- Error: красный (#c62828)
- Info: синий (#0277bd)

Кнопка всегда синяя (#3A54DA) с ховером (#2a44ca).
