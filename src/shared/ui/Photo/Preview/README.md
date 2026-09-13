# Preview Component

Переиспользуемый компонент для просмотра галереи изображений с модальным окном.

## Особенности

- 🖼️ Модальное окно для просмотра изображений в полном размере
- ⌨️ Навигация с помощью клавиатуры (Escape, стрелки)
- 👆 Навигация с помощью кнопок и миниатюр  
- 🔢 Счетчик изображений
- 📱 Адаптивный дизайн для мобильных устройств
- 🚫 Блокировка скролла страницы при открытии

## Использование

### Простой пример

```tsx
import React from 'react';
import { Preview, usePreview } from '../shared/ui/Preview';

const MyComponent = () => {
    const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
    ];

    const gallery = usePreview({ images });

    return (
        <div>
            {images.map((image, index) => (
                <img 
                    key={index}
                    src={image}
                    alt={`Image ${index + 1}`}
                    onClick={() => gallery.openGallery(index)}
                    style={{ cursor: 'pointer', width: 100, height: 100 }}
                />
            ))}
            
            <Preview
                isOpen={gallery.isOpen}
                images={images}
                currentIndex={gallery.currentIndex}
                onClose={gallery.closeGallery}
                onNext={gallery.goToNext}
                onPrevious={gallery.goToPrevious}
                onSelectImage={gallery.selectImage}
            />
        </div>
    );
};
```

### Пример с динамическими изображениями

```tsx
import React, { useState } from 'react';
import { Preview, usePreview } from '../shared/ui/Preview';

const ReviewPhotos = ({ reviewImages }) => {
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const gallery = usePreview({ images: galleryImages });

    const openPhotoGallery = (images: string[], startIndex: number = 0) => {
        setGalleryImages(images);
        gallery.openGallery(startIndex);
    };

    return (
        <div>
            {/* Миниатюры изображений */}
            <div className="photo-thumbnails">
                {reviewImages.map((img, index) => (
                    <img
                        key={index}
                        src={img.thumbnail}
                        alt={`Photo ${index + 1}`}
                        onClick={() => openPhotoGallery(
                            reviewImages.map(r => r.fullSize), 
                            index
                        )}
                        className="thumbnail"
                    />
                ))}
            </div>

            <Preview
                isOpen={gallery.isOpen}
                images={galleryImages}
                currentIndex={gallery.currentIndex}
                onClose={gallery.closeGallery}
                onNext={gallery.goToNext}
                onPrevious={gallery.goToPrevious}
                onSelectImage={gallery.selectImage}
                fallbackImage="/path/to/fallback.png"
            />
        </div>
    );
};
```

## API

### usePreview Hook

```tsx
const gallery = usePreview({
    images: string[],           // Массив URL изображений
    onOpen?: () => void,        // Колбэк при открытии галереи
    onClose?: () => void,       // Колбэк при закрытии галереи  
    onImageChange?: (index: number) => void  // Колбэк при смене изображения
});

// Возвращаемые методы и состояния:
gallery.isOpen              // boolean - открыта ли галерея
gallery.currentIndex        // number - текущий индекс изображения
gallery.openGallery(index)  // Открыть галерею с указанного изображения
gallery.closeGallery()      // Закрыть галерею
gallery.goToNext()          // Перейти к следующему изображению
gallery.goToPrevious()      // Перейти к предыдущему изображению  
gallery.selectImage(index)  // Выбрать изображение по индексу
```

### Preview Props

```tsx
interface PhotoGalleryProps {
    isOpen: boolean;                           // Открыта ли галерея
    images: string[];                          // Массив URL изображений
    currentIndex: number;                      // Текущий индекс изображения
    onClose: () => void;                       // Функция закрытия
    onNext: () => void;                        // Функция перехода к следующему
    onPrevious: () => void;                    // Функция перехода к предыдущему
    onSelectImage: (index: number) => void;    // Функция выбора по индексу
    fallbackImage?: string;                    // Изображение-заглушка при ошибке загрузки
}
```

## Управление

### Клавиатура
- **Escape** - закрыть галерею
- **←** (стрелка влево) - предыдущее изображение
- **→** (стрелка вправо) - следующее изображение

### Мышь/Touch
- Клик по оверлею - закрыть галерею
- Клик по кнопкам навигации - переключение изображений
- Клик по миниатюре - переход к конкретному изображению

## Стилизация

Компонент использует CSS модули. Основные классы:
- `.photo_modal_overlay` - оверлей модального окна
- `.photo_modal_content` - контейнер содержимого
- `.photo_modal_image` - основное изображение
- `.photo_modal_thumbnails` - контейнер миниатюр
- `.photo_modal_nav` - кнопки навигации