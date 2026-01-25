# OAuth Integration: Google, Facebook, Instagram

## Статус реализации

✅ **Google OAuth** — полностью интегрирован  
✅ **Facebook OAuth** — полностью интегрирован  
✅ **Instagram OAuth** — полностью интегрирован

## Архитектура

### Файлы компонентов

1. **`src/features/auth/AuthModal.tsx`** — модалка с кнопками социальной авторизации
   - Функция `handleOAuthStart(provider)` — инициирует OAuth поток
   - Поддерживает: `google`, `facebook`, `instagram`, `telegram`
   - Сохраняет роль и специальность в `sessionStorage` перед редиректом

2. **`src/pages/GoogleOAuthPage/GoogleOAuthPage.tsx`** — обработка Google callback
   - Получает `code`, `state` параметры
   - Отправляет на `POST /api/auth/google/callback`
   - Сохраняет токен и редиректит на главную

3. **`src/pages/GoogleOAuthPage/OAuthCallbackPage.tsx`** — универсальная обработка callback
   - Поддерживает все провайдеры: Google, Facebook, Instagram
   - Автоматически определяет провайдера по URL
   - Отправляет на `POST /api/auth/{provider}/callback`
   - Для Google перенаправляет на `GoogleOAuthPage`

### Роуты

```typescript
// Инициирование авторизации
GET /auth/google         — перенаправляет на сервер для Google OAuth
GET /auth/facebook       — перенаправляет на сервер для Facebook OAuth  
GET /auth/instagram      — перенаправляет на сервер для Instagram OAuth

// Callback обработка (после авторизации у провайдера)
GET /auth/google/callback       → GoogleOAuthPage → POST /api/auth/google/callback
GET /auth/facebook/callback     → OAuthCallbackPage → POST /api/auth/facebook/callback
GET /auth/instagram/callback    → OAuthCallbackPage → POST /api/auth/instagram/callback
```

## Поток авторизации

### 1. Инициирование (в AuthModal)

```typescript
const handleOAuthStart = (provider: 'google' | 'facebook' | 'instagram') => {
    // Сохраняем выбранную роль
    sessionStorage.setItem(`pending${Provider}Role`, formData.role);
    
    // Если master — сохраняем специальность
    if (formData.role === 'master' && formData.specialty) {
        sessionStorage.setItem(`pending${Provider}Specialty`, formData.specialty);
    }

    // Генерируем CSRF token
    const csrfState = Math.random().toString(36).substring(2);
    sessionStorage.setItem(`${provider}CsrfState`, csrfState);

    // Получаем URL для OAuth
    fetch(`${API_BASE_URL}/api/auth/${provider}/url?state=${csrfState}`)
        .then(res => res.json())
        .then(data => {
            // Перенаправляем на OAuth провайдера
            window.location.href = data.url;
        });
};
```

### 2. Callback от провайдера

Провайдер перенаправляет пользователя обратно с параметрами:
```
/auth/{provider}/callback?code=...&state=...
```

### 3. Обработка callback

**Для Google** (`GoogleOAuthPage.tsx`):
```typescript
// Получаем роль из sessionStorage
const savedRole = sessionStorage.getItem('pendingGoogleRole') || 'client';

// Отправляем на бекенд с кодом и ролью
POST /api/auth/google/callback {
    code: string,
    state: string,
    role: 'master' | 'client',
    occupation?: string (если master)
}
```

**Для Facebook и Instagram** (`OAuthCallbackPage.tsx`):
```typescript
// Аналогично, но provider определяется из URL
POST /api/auth/{provider}/callback {
    code: string,
    state: string,
    role: 'master' | 'client',
    occupation?: string (если master)
}
```

### 4. Ответ сервера

```typescript
{
    user: {
        id: number,
        email: string,
        name: string,
        surname: string,
        roles: string[],
        occupation?: OccupationObject[],
        oauthType?: {
            googleId?: string,
            facebookId?: string,
            instagramId?: string
        }
    },
    token: string,
    message: string
}
```

### 5. Сохранение в клиенте

```typescript
// Сохраняем токен и данные пользователя
setAuthToken(data.token);
setUserData(data.user);
setUserRole(finalRole); // master или client
if (data.user.occupation) {
    setUserOccupation(data.user.occupation);
}

// Очищаем временные данные
sessionStorage.removeItem(`pending${Provider}Role`);
sessionStorage.removeItem(`pending${Provider}Specialty`);

// Редиректим на главную
navigate('/');
```

## API Эндпоинты

### Инициирование авторизации

```
GET /api/auth/{provider}/url?state={state}

Parameters:
  - provider: 'google' | 'facebook' | 'instagram'
  - state: CSRF token для защиты

Response:
{
    url: string  // URL для редиректа на OAuth провайдера
}
```

### Callback обработка

```
POST /api/auth/{provider}/callback

Body:
{
    code: string,           // Authorization code от провайдера
    state: string,          // CSRF token для проверки
    role: 'master' | 'client',  // Выбранная роль пользователя
    occupation?: string     // URL на специальность (если master)
}

Response:
{
    user: UserObject,
    token: string,
    message: string
}
```

## Обработка ошибок

### Ошибки от провайдера
```typescript
// Если провайдер вернет ошибку параметра
/auth/{provider}/callback?error=access_denied&error_description=User+denied

// OAuthCallbackPage обнаружит и покажет ошибку
if (errorParam) {
    setError(`Ошибка ${provider}: ${errorDescription}`);
    // Редирект на главную через 3 секунды
}
```

### Ошибки от бекенда
```typescript
// Если ответ не OK
try {
    const errorData = JSON.parse(responseText);
    throw new Error(errorData.error_description || errorData.message);
} catch (parseError) {
    throw new Error(`HTTP ${response.status}`);
}
```

## Роли пользователя

### Client
- Может публиковать заказы
- Ищет мастеров для выполнения работ

### Master
- Должен выбрать специальность (occupation) при регистрации
- Из доступных в `/api/occupations`
- Может предлагать свои услуги

## Технические детали

### SessionStorage ключи

```typescript
// Для каждого провайдера сохраняются:
pendingGoogleRole        // 'master' | 'client'
pendingGoogleSpecialty   // ID специальности
googleCsrfState          // CSRF token

pendingFacebookRole      // 'master' | 'client'
pendingFacebookSpecialty // ID специальности
facebookCsrfState        // CSRF token

pendingInstagramRole     // 'master' | 'client'
pendingInstagramSpecialty // ID специальности
instagramCsrfState       // CSRF token
```

### LocalStorage (auth.ts)

```typescript
// Сохраняется через setAuthToken() и другие функции
authToken               // JWT токен
tokenExpiry            // Дата истечения (на 1 час)
userData               // JSON с данными пользователя
userRole               // 'master' | 'client'
userEmail              // Email пользователя
userOccupation         // JSON массив специальностей (для master)
selectedCity           // Выбранный город
```

## Иконки

Расположение: `public/`
- `google.png` / `chrome.png` — для Google
- `facebook.png` — для Facebook
- `instagram.png` — для Instagram
- `telegram.png` — для Telegram

## Стили

`src/features/auth/AuthModal.module.scss`:
```scss
.googleButton   // Google кнопка
.facebookButton // Facebook кнопка
.instagramButton // Instagram кнопка
.telegramButton // Telegram кнопка
.socialButtons  // Контейнер для всех кнопок
```

## Чек-лист для тестирования

- [ ] Google OAuth работает (логин)
- [ ] Google OAuth работает (регистрация с выбором роли)
- [ ] Facebook OAuth работает (логин)
- [ ] Facebook OAuth работает (регистрация с выбором роли)
- [ ] Instagram OAuth работает (логин)
- [ ] Instagram OAuth работает (регистрация с выбором роли)
- [ ] После регистрации master видны специальности
- [ ] Токен сохраняется и работает
- [ ] При ошибке провайдера показывается сообщение об ошибке
- [ ] При ошибке бекенда показывается сообщение об ошибке
- [ ] Перенаправление на главную после успешной авторизации
- [ ] SessionStorage очищается после авторизации
- [ ] Роль и специальность сохраняются правильно

## Готовые компоненты и функции

✅ `AuthModal` — полностью готов для всех трех провайдеров  
✅ `GoogleOAuthPage` — полностью готов  
✅ `OAuthCallbackPage` — полностью готов для Facebook и Instagram  
✅ Роуты в `router/index.tsx` — готовы  
✅ `src/utils/auth.ts` — функции для сохранения данных готовы  
✅ Иконки в `public/` — все есть  
✅ Стили в SCSS — все готовы  

## Что осталось на бекенде

1. `GET /api/auth/{provider}/url?state={state}` — вернуть URL для OAuth
2. `POST /api/auth/{provider}/callback` — обработать callback и вернуть token + user data

Оба эндпоинта работают с `code`, `state`, `role`, `occupation` параметрами.
