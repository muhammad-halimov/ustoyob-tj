# ustoyob.tj — frontend

Веб-клиент маркетплейса услуг [ustoyob.tj](https://ustoyob.tj): объявления и услуги, чаты, отзывы, избранное, техподдержка. Тот же код собирается в мобильное приложение через Capacitor (Android/iOS) — см. [«Нативное приложение»](#нативное-приложение-capacitor).

Бэкенд — Symfony + API Platform, отдельный репозиторий (`ustoyob-tj`). Полный контракт API — `API_REFERENCE.md` в том репозитории; здесь он пересказывается только там, где это влияет на грабли фронта.

**Стек:** Vite 7 · React 19 · TypeScript 5.9 · react-router 7 · Redux Toolkit (почти не используется, см. `AGENTS.md`) · SCSS-модули · i18next (tj / ru / eng) · Swiper · Mercure (SSE) · Capacitor 8.

---

## Быстрый старт

```bash
npm install
cp .env .env.local      # и заполните значения, см. ниже
npm run dev             # https://localhost:5173, HMR
```

Dev-сервер поднимается по **HTTPS с самоподписанным сертификатом** (`@vitejs/plugin-basic-ssl`) — браузер попросит подтвердить исключение. Запросы `/api`, `/uploads` и `/media` проксируются на `VITE_PROXY_BASE_URL` (`vite.config.ts`).

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер Vite |
| `npm run build` | `tsc -b` + `vite build` (в prod вырезаются `console.*` и `debugger`) |
| `npm run preview` | локальный просмотр prod-сборки |
| `npm run lint` | ESLint |

> **Проверка типов.** Используйте `npx tsc --noEmit -p tsconfig.app.json`. Корневой `tsc --noEmit -p .` в этом репозитории **ничего не проверяет** (корневой tsconfig только ссылается на `tsconfig.app.json`/`tsconfig.node.json`) и всегда «зелёный» — легко принять за успех.

## Переменные окружения

Все — `VITE_*`, читаются на этапе сборки. Типы — `src/types/vite-env.d.ts`.

| Переменная | Назначение | Замечания |
|---|---|---|
| `VITE_API_BASE_URL` | База для всех запросов к API | **Пусто** = относительные URL (`/api/...`) → в dev их ловит прокси Vite. В prod задайте origin бэкенда, если он не на том же домене. |
| `VITE_PROXY_BASE_URL` | Куда dev-прокси шлёт `/api`, `/uploads` и `/media` | Только для `npm run dev`. |
| `VITE_MERCURE_HUB_URL` | URL Mercure-хаба (`…/.well-known/mercure`) | Нужен чату и ТП для realtime. Токен подписки выдаёт бэкенд, URL хаба в JSON API **не приходит**. |
| `VITE_TELEGRAM_BOT_NAME` | Username **auth-бота** для Telegram Login Widget (без `@`) | См. раздел про Telegram. Это **не** бот техподдержки. |
| `VITE_APP_ORIGIN` | Публичный origin сайта для OAuth из нативного приложения | По умолчанию `https://ustoyob.tj`. |
| `VITE_PAGE_SIZE_MOBILE` / `VITE_PAGE_SIZE_DESKTOP` | Элементов на страницу (<768px / ≥768px) | По умолчанию 10. |

## Структура

```
src/
  app/          вход (main.tsx), роутер, layout, store, глобальные стили
  pages/        страницы по фичам: main, tickets, chats, profile, favorites, support, legal, auth, OAuth
  shared/ui/    переиспользуемые компоненты (Header, Footer, Modal/*, Ticket/Card, Photo/*, Tabs …)
  widgets/      составные виджеты (Banners, Sorting, EmptyState, PageLoader, ThemeToggle …)
  entities/     типы: api/ — формы бэкенда, view/ — модели для UI
  hooks/        useFavorites, useRespondToTicket, useShowMore, …
  utils/        apiUtils, authUtils, chatUtils, imageUtils, mercureUtils, oauthPopup, mobileOAuth …
  locales/      i18n.ts + languages/{tj,ru,eng}/*.json
guides/         внутренние гайды (OAuth, UUID, темы, i18n …)
AGENTS.md       карта проекта для AI-агентов и новых разработчиков
```

## Ключевые механизмы (коротко)

- **API:** всё через `universalApiRequest` (`utils/apiUtils.ts`) — добавляет `?locale=`, `Authorization`, один раз рефрешит токен на 401, кидает `ApiError` с `code`/`message`. Пагинация — `parsePagedResponse`.
- **Авторизация:** JWT в `localStorage`, refresh — HttpOnly-cookie (`/api/refresh_token`). Цикл обновления — `setupTokenRefresh` в `Layout`. Логин-модалка открывается глобально событием `openAuthModal`.
- **Язык:** по умолчанию **таджикский** (`tj`), выбор хранится в `localStorage['i18nextLng']`. Название/описание сущностей локализует бэкенд по `?locale=`, поэтому при смене языка данные перезапрашиваются (`useLanguageChange`).
- **Realtime:** Mercure (SSE) для чатов и ТП — `utils/mercureUtils.ts`. Токен подписки: `GET /chats/{id}/subscribe`, `/chats/inbox-token`, `/tech-supports/{id}/subscribe`, `/tech-supports/inbox-token`.
- **Отклик на объявление:** перед созданием чата проверяется, нет ли уже переписки (`GET /chats/me?user=`) — `utils/chatUtils.ts` (`resolveTicketChat`) + `hooks/useRespondToTicket` + модалка `ExistingChatChoice`.
- **«Недавно просмотренные»:** залогиненный — `/api/recently-watched`, гость — `localStorage['recentlyWatchedGuest']` (переносится на сервер при входе). `utils/recentlyWatchedUtils.ts`.
- **Тема:** светлая/тёмная, токены — CSS-переменные в `src/app/styles/_variables.scss`.

---

# Известные сложности и как их чинить

Формат: **симптом → причина → что делать**.

## 1. Telegram-боты и вход через Telegram

### Два разных бота — не путать

| Бот | Для чего | Где используется |
|---|---|---|
| **auth-бот** (`ustoyobtj_auth_bot`) | Telegram Login Widget: вход/регистрация/привязка Telegram-аккаунта | Фронт: `VITE_TELEGRAM_BOT_NAME`. Бэк: `TELEGRAM_AUTH_BOT_TOKEN`. |
| **бот техподдержки** (`ustoyobtj_tech_support_bot`) | Уведомления операторам о новых обращениях | Только бэкенд: `TELEGRAM_BOT_TOKEN`. Фронт его не касается. |

Токены/имена ботов из разных пар перепутать очень легко, а симптом всегда один и тот же — «Telegram-вход не работает» (см. таблицу ниже).

### Как устроен вход

1. Кнопка Telegram в `Auth.tsx` (`handleTelegramAuthClick`) сохраняет роль/специальность в `sessionStorage` (`pendingTelegramRole`/`pendingTelegramSpecialty`) и создаёт оверлей со скриптом `telegram.org/js/telegram-widget.js` с `data-telegram-login=<VITE_TELEGRAM_BOT_NAME>` и **`data-auth-url=<origin>/auth/telegram/callback`**.
2. После подтверждения в Telegram виджет **редиректит браузер** на `/auth/telegram/callback?id=…&first_name=…&auth_date=…&hash=…`.
3. `TelegramCallbackPage` отправляет эти поля на `POST /api/auth/telegram/callback` (`id, hash, authDate, firstName, …, role`). Подпись (`hash`, HMAC по токену auth-бота) **проверяет бэкенд**, фронт ничего не валидирует.
4. Привязка Telegram к существующему аккаунту — тот же виджет из профиля (`LinkedAccountsSection`), режим помечен `localStorage['oauth_mode_telegram']='link'`, запрос уходит на `POST /api/profile/oauth/link`.

### Симптомы и лечение

| Симптом | Причина | Что делать |
|---|---|---|
| Виджет пишет **«Bot domain invalid»** | Домен страницы не зарегистрирован у бота в BotFather. Telegram сверяет домен, с которого открыт виджет, с тем, что задан командой `/setdomain`. Типичные случаи: `localhost`/self-signed dev-хост, preview-домен, пакетное приложение (`https://localhost` внутри WebView). | В [@BotFather](https://t.me/BotFather): `/setdomain` → выбрать auth-бота → указать реальный домен (`ustoyob.tj`). Для нативного приложения ничего в BotFather менять не нужно — виджет там запускается на **публичном сайте** во внешнем in-app-браузере (см. [нативное приложение](#нативное-приложение-capacitor)). |
| Кнопка Telegram **вообще не рисуется**, в консоли CSP-ошибка про `eval` | У `telegram-widget.js` атрибут `data-onauth` разбирается через `eval()`, а CSP в `index.html` (`script-src` без `'unsafe-eval'`) его блокирует. | Использовать **`data-auth-url`** (редирект), а не `data-onauth` — так и сделано. Не переключайтесь на `data-onauth` и не ослабляйте CSP. Проверьте, что в CSP остались `https://telegram.org`, `https://oauth.telegram.org` (`script-src`) и `frame-src https://oauth.telegram.org`. |
| **Любой** Telegram-вход даёт `oauth_invalid_signature` | Бэкенд подписывает/проверяет `hash` токеном **не того бота**. Виджет настроен на auth-бота, а `TELEGRAM_AUTH_BOT_TOKEN` пуст или содержит токен бота техподдержки (`TELEGRAM_BOT_TOKEN`). | На бэкенде задать `TELEGRAM_AUTH_BOT_TOKEN` = токен **именно того бота**, чьё имя стоит в `VITE_TELEGRAM_BOT_NAME` (BotFather → `/mybots` → API Token). После смены — перезапустить бэкенд. |
| `oauth_telegram_expired` | `auth_date` старше 600 секунд. Пользователь долго держал страницу подтверждения открытой; либо сильно уехали часы устройства. | Просто повторить вход. Фронт дополнительно отсекает такой запрос сам (`TelegramCallbackPage`, окно 10 минут). |
| `422 ConstraintViolationList` на `/auth/telegram/callback` | Не пришли обязательные `hash`/`authDate` (обязательны с 27.08.2026 — раньше их не было). | Убедиться, что в запрос уходят и `hash`, и `authDate` (`TelegramCallbackPage` их шлёт); не собирать тело запроса руками без этих полей. |
| «user not found» / «chat not found» у тех, кто **ни разу не писал боту** | Старая проверка бэкенда через Bot API `getChat` не работает для пользователей без диалога с ботом. Исправлено на проверку подписи виджета. | Ничего на фронте. Если всплыло снова — проверить, что деплой бэкенда содержит проверку по HMAC, а не `getChat`. |
| В мобильном Telegram-приложении подтверждение открывается **в новой вкладке**, а исходная так и остаётся «залогиненной наполовину» | Мобильное приложение Telegram возвращает callback не в ту вкладку, откуда начали. | Уже обработано: `TelegramCallbackPage` пишет сигнал в `localStorage` (`telegram_login_success` / `telegram_link_success`) и пытается закрыться, а исходная вкладка ловит `storage`-событие (`Auth.tsx`, `Profile.tsx`). Не удаляйте эти ключи и не «оптимизируйте» слушатель `storage`. |
| Telegram-вход не работает **локально** (`npm run dev`) | Dev-хост не зарегистрирован в BotFather (см. «Bot domain invalid»); один бот = один домен. | Вариант: отдельный **тестовый бот** + туннель (ngrok/cloudflared) на публичный домен, `/setdomain` для тестового бота, `VITE_TELEGRAM_BOT_NAME` = тестовый бот в `.env.local`, а на локальном бэкенде `TELEGRAM_AUTH_BOT_TOKEN` = токен того же тестового бота. Прод-бот трогать не нужно. |
| Ошибки типов вокруг Telegram `id` | `TelegramUserData.id` — **внешний числовой id Telegram**, а не UUID нашей сущности. | Оставлять `number`. Не «мигрировать» на `string` вместе с остальными id (см. раздел про UUID). |

## 2. OAuth в целом (Google / Facebook / Instagram)

Подробности и история — `guides/OAUTH_INTEGRATION.md` (частично устарел) и комментарии в `utils/oauthPopup.ts`, `utils/mobileOAuth.ts`. Кратко:

| Симптом | Причина | Что делать |
|---|---|---|
| Окно входа блокируется (Safari особенно) | `window.open` вызван после `await` — жест пользователя «остыл». | Popup открывается **синхронно в обработчике клика** (`openOAuthPopup`), и только потом идёт запрос за реальным URL; окно донавигируется (`navigateOAuthPopup`). Не переносите `openOAuthPopup` под `await`. |
| После входа через Facebook окно не закрывается, страница не перезагружается | Facebook отдаёт свои страницы с `Cross-Origin-Opener-Policy`, что рвёт `window.opener`; `postMessage` не долетает. | Основной канал — `localStorage` + событие `storage` (`finishOAuthPopup` / `waitForOAuthPopupResult`), `postMessage` — ускоритель. Признак «мы в popup» берётся из OAuth-`state`, а не из `window.name`/`opener` (их браузеры сбрасывают при кросс-сайтовой навигации). |
| Повторный вход «молча» не срабатывает | Браузер не шлёт `storage`, если новое значение **побайтно равно** старому. | В сигнал добавляется `ts: Date.now()`. Не убирайте. |
| popup закрылся сам, а логин прошёл — показывает «отмена» | Опрос `popup.closed` срабатывал раньше, чем долетал сигнал. | Стоит 300 мс задержка перед `popup_closed`, и при закрытии проверяется, не появился ли токен. Не убирайте. |
| На мобильном при входе через Instagram/Facebook получается **две вкладки** | ОС перехватывает переход на домен провайдера (Universal/App Links) и открывает нативное приложение, потом возвращает пользователя в браузер в *новую* вкладку. | **Ограничение платформы**, не баг: popup снижает вероятность, но решает ОС. В инкогнито (где нет приложений) такого нет. Не пытайтесь «лечить» ветвлением по устройству — такая попытка уже делалась и была откатана как регресс. |
| Instagram: `oauth_instagram_professional_required` | Meta закрыла Basic Display API (04.12.2024); работают только **Professional** (Business/Creator) аккаунты. Личный аккаунт проходит согласие, но падает на получении профиля. | Показывается заглушка `InstagramLinkNotice` до старта OAuth с инструкцией «переключите аккаунт на Professional». Исправить на нашей стороне нельзя. |
| «Аккаунт с таким email уже существует» (`email_taken` / `oauth.emailTaken`) | Человек регистрировался по email+паролю, а потом жмёт «Войти через Google» с тем же email. | Сначала войти в исходный аккаунт, затем привязать провайдера в профиле («Привязанные аккаунты»). Пояснение уже висит баннером под иконками OAuth в `Auth.tsx`. |
| Google: `500` вместо `oauth_code_exchange_failed` | Раньше падало при недоступности сертификатов Google на бэке. | Исправлено на бэке; сейчас это обычный `400 oauth_code_exchange_failed`. |

### Нативное приложение (Capacitor)

`window.open()` внутри WebView **не создаёт настоящий popup** — навигация уходит во внешний Chrome, а провайдеры видят origin `https://localhost`, который нигде не зарегистрирован. Поэтому в приложении OAuth идёт так (`utils/mobileOAuth.ts`):

1. `@capacitor/browser` открывает **публичный сайт** (`VITE_APP_ORIGIN`, страницы `/auth/<provider>/start?mobile=1`) во внешнем in-app-браузере.
2. Callback-страницы сайта, получив токен, отдают его приложению по deep link `tj.ustoyob.app://oauth-callback`.
3. `@capacitor/app` (`appUrlOpen`) ловит ссылку и завершает вход.

**Важно:** эти страницы должны быть задеплоены **и на публичный сайт** — иначе браузер откроется, а обратно в приложение вход не вернётся. Схему `tj.ustoyob.app` нужно зарегистрировать в `AndroidManifest.xml`/`Info.plist`.

## 3. Контракт с бэкендом — частые грабли

### UUID вместо int (06.09.2026)
Все id сущностей теперь UUIDv7-**строки**. Читать `guides/UUID_MIGRATION_GUIDE.md` до любых правок, связанных с id.
- **Нельзя:** `Number(id)`, `parseInt(id)`, `typeof id === 'number'`, `/\/(\d+)$/` для разбора IRI, арифметику/сравнения `id > 5`. Они **молча** дают `NaN`/обрезанное число (`"01a0…"` → `1`) — TypeScript не ругается.
- **Можно:** `string | number` в типах, `String(a) === String(b)` для сравнения, `/\/([^/]+)$/` для IRI.
- Поиск потенциальных остатков: `grep -rnE "parseInt\(|Number\(|typeof [a-zA-Z_.?]+ === 'number'|\\\\d\+" src`. Учтите, что переменная может называться `raw`, `param` и т. п., а не `id`.

### Пустые списки — это `404`, а не `[]`
`/chats/me`, `/tickets/me`, `/recently-watched` (и `?ticket=`/`?user=` без совпадений) при пустом результате отдают **`404 resource_not_found`**. Ловите `ApiError` с `http === 404` как «пусто» (`getChatsWithUser`, `getRecentlyWatched`), а не как ошибку.

### Персональные поля скрыты от чужих
`User.email` (с 05.09.2026) и `User.dateOfBirth` (с 09.09.2026) приходят **только** на `GET /users/me`. Для чужих профилей, тикетов, отзывов, чатов их нет — код не должен на них полагаться (возраст в `ProfileHeader` скрывается сам, если даты нет).

### Формат ошибок
Два формата: `{ code, message }` (бизнес-логика/auth, локализуется `?locale=`) и API Platform `ConstraintViolationList` (`422`, поле `violations[]`, не локализуется). Различайте по форме, а не по статусу. `code` есть у всего из каталога `GET /api/app-messages`.

### Жалобы (`/api/appeals`)
- Причины для дропдауна — `GET /api/appeal-reasons?applicableTo=<тип>&authRequired=<bool>`; тип причины должен совпадать с типом жалобы (`chat`/`ticket`/`review`/`user`) плюс общие `overall`. Жалоба на пользователя тянет `applicableTo=user`.
- **Чат — особый случай:** для `type=chat` бэкенд **безусловно** отклоняет причину с `authRequired=true` (`401 auth_required_for_chat_appeals`), даже у залогиненного. Для чата всегда запрашивайте только `authRequired=false` (`Feedback.tsx`). Для остальных типов проверка `authRequired && !bearer` пропускает залогиненных.

### Картинки
- В `PATCH` любой сущности `images` — это `[{ image: "<filename>" }]`, **без `id`**. **Не передан** = не трогать фото, **`[]`** = удалить все.
- Загрузка — `POST /{ресурс}/{id}/upload-images`, `multipart`, поле `imageFile[]`, ≤10 МБ, png/jpeg/jpg/webp. Все загрузки идут через `uploadPhotos()` (`utils/imageUtils.ts`), который **сжимает фото в браузере** (canvas → WebP/JPEG, до 1920px, аватар до 1024px; на любой сбой шлёт оригинал).
- **Превью, WebP и BlurHash отдаёт бэкенд** (`API_REFERENCE.md` §14): у любой сущности с `image` есть `imageUrl` / `imageThumbnail` (480 px) / `imageMedium` (800 px) / `imageWebp` / `imageBlurhash`. На фронте: `toPhotoSource()` и `getAuthorAvatar()` в `utils/imageUtils.ts`, `blurhashToDataUrl()` в `utils/blurhashUtils.ts`, `Carousel` принимает `sources` (карточки — `variant="thumbnail"`, страница объявления — `medium`, галерея — `imageWebp`). BlurHash рисуется фоном самого `<img>`. Грабли: (1) превью живут под **`/media/cache/resolve/...`** — в dev это проксируется (`vite.config.ts`), а на проде веб-сервер должен отдавать `/media` бэкенду так же, как `/uploads`, иначе превью не загрузятся; первый запрос строит файл и отвечает `302` на статический `.webp`; (2) `imageBlurhash` бывает `null` на старых фото, пока на сервере не прогнан `app:images:backfill-blurhash` — заглушки просто не будет; (3) не всё ещё переведено на превью: галерея/примеры работ в профиле и фото отзывов пока грузят оригиналы.
- `<img>` в лентах имеют `loading="lazy" decoding="async"`; без `lazy` намеренно оставлены иконки в модалках, флаги в хедере, аватар профиля и лайтбокс (`Preview`) — скрытые `lazy`-картинки не грузятся вообще.

### Редактирование и удаление
Окно правки: **15 минут** для сообщений чата/ТП, **24 часа** для отзывов и `title`/`description`/`images` тикета ТП (`403 edit_window_expired`); текст нельзя переписать целиком (`400 edit_too_different`, схожесть ≥ 50%). Удаление сообщений — «мягкое» (`deletedByAuthor`, плейсхолдер вместо текста).

### Техподдержка
- Гость создаёт обращение с `guestEmail`; в ответе на POST приходит `guestAccessToken` — он **один раз** нужен для загрузки фото к этому обращению (`X-Guest-Access-Token`). Потеряли — фото прикрепить уже нельзя.
- Realtime: `created` (новое сообщение), `updated` (только смена статуса), `images_updated` (фото тикета). Правка/удаление сообщения и «прочитано» событий **не** шлют — нужен рефетч.
- id тикета в `?ticket=` — строка; не парсить числом (это был реальный баг).

### Чаты
- «Удалить чат» — только для себя; удаляется физически, когда удалят обе стороны. Новое сообщение снова показывает чат у обоих.
- Блокировка асимметрична: блокирует только сообщения от заблокированного (`403 user_blocked` на `POST /chat-messages` и при создании чата).
- Параметр `?chatId=` в URL страницы чата применяется **один раз** на загрузку. Раньше он «прилипал» и фоновый 60-секундный опрос заново открывал (и помечал прочитанным) старый чат.

## 4. Разработка: прочие грабли

| Симптом | Причина | Что делать |
|---|---|---|
| В dev refresh-токен «не сохраняется», `POST /refresh_token` → `401 Missing JWT Refresh Token` | Прокси возвращает cookie с `Domain=<домен бэка>`, браузер (видя только origin dev-сервера) молча её отбрасывает. | В `vite.config.ts` стоит `cookieDomainRewrite: ''` — не удаляйте. |
| Чат/ТП «мёртвые», нет realtime | Не задан/неверен `VITE_MERCURE_HUB_URL` либо хаб недоступен из браузера (CORS; а страница по HTTPS не может подключаться к хабу по HTTP — Mixed Content). | Проверить URL хаба и что токен подписки приходит (`/chats/{id}/subscribe`). |
| В светлой теме пропала линия/граница | `--color-stroke` и `--color-background-all` в светлой теме — **один и тот же цвет** (`#F2F2F5`); бордер `color-stroke` на элементе без своей белой подложки невидим. | Для линий прямо на фоне страницы использовать `--color-hover-with-border-btn` (тёмнее фона в обеих темах). |
| Блок оказался «нерабочим» только на некоторых страницах, tsc чист | Логика опирается на `parseInt`/`typeof`/regex по id — TypeScript этого не ловит (см. UUID). | Прогнать grep из раздела UUID. |
| `tsc` зелёный, а типы явно сломаны | Запущен корневой `tsc -p .` (он ничего не проверяет). | `npx tsc --noEmit -p tsconfig.app.json`. |
| Список категорий/городов «не обновился» после смены языка | Данные кэшируются в `dataCacheUtils` (5–30 мин) по паре «язык + параметры». | Кэш чистится на событие `languageChanged`; для ручного сброса — `clearCache(<тип>)` из `dataCacheUtils`. |

---

## Документация внутри репозитория

- `AGENTS.md` — карта проекта, паттерны, типовые задачи.
- `guides/UUID_MIGRATION_GUIDE.md` — переход id int → UUID (читать первым при работе с id).
- `guides/OAUTH_INTEGRATION.md` — исходная схема OAuth (реализация с тех пор ушла в popup-флоу, актуальные детали — в комментариях `utils/oauthPopup.ts` и `utils/mobileOAuth.ts`).
- `guides/I18N_GUIDE.md`, `guides/TRANSLATION_*.md` — локализация.
- `guides/DARK_THEME_GUIDE.md` — тёмная тема и токены цветов.
- Компонентные README — например `src/shared/ui/Photo/Preview/README.md`.
