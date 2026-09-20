# USTOYOB.TJ

**USTOYOB.TJ** (перс. «Usto» — мастер, «Yob» — находчик) — платформа поиска и найма мастеров любой категории для жителей Республики Таджикистан.

**Миссия:** сделать поиск и найм мастеров простым, быстрым и безопасным для каждого, используя только интуитивно понятные визуальные элементы.

Этот репозиторий — **серверная часть**: API-first backend и админ-панель. Клиентские приложения (web/mobile) живут отдельно.

## Содержание

1. [Стек](#стек)
2. [Быстрый старт](#быстрый-старт)
3. [Конфигурация](#конфигурация)
4. [Фикстуры и тестовые данные](#фикстуры-и-тестовые-данные)
5. [API: соглашения](#api-соглашения)
6. [Ключевые механики](#ключевые-механики)
7. [Админ-панель](#админ-панель)
8. [Тесты](#тесты)
9. [Деплой](#деплой)
10. [Проблемы и решения](#проблемы-и-решения)
11. [Документы и ссылки](#документы-и-ссылки)

## Стек

| Компонент | Что используется |
|---|---|
| Язык / фреймворк | PHP ≥ 8.4, Symfony 7.4 |
| API | API Platform 4 (ресурсы описаны атрибутами в `src/Entity/*`) |
| БД | PostgreSQL 16, Doctrine ORM (**без миграций**, см. [Деплой](#деплой)) |
| Авторизация | JWT (Lexik) + refresh-токен в HttpOnly-cookie (Gesdinet) |
| Кэш / счётчики | Redis (пулы кэша, дедупликация просмотров тикетов) |
| Реалтайм | Mercure (чаты) |
| Админка | EasyAdmin |
| Файлы | VichUploader → `public/uploads` |
| Уведомления | e-mail (Symfony Mailer), Telegram-бот (BotMan) |

## Быстрый старт

Нужно: PHP ≥ 8.4 с расширениями `ctype`, `curl`, `iconv`, `mbstring`, `pdo_pgsql`; Composer; PostgreSQL 16; Redis; [Symfony CLI](https://symfony.com/download); Docker (только для Mercure и почтового ловца).

```bash
# 1. Зависимости (composer update не нужен — версии зафиксированы в composer.lock)
composer install

# 2. Окружение: скопируйте .env в .env.local и поправьте DATABASE_URL (см. «Конфигурация»)
cp .env .env.local

# 3. База и схема
php bin/console doctrine:database:create
php bin/console doctrine:schema:update --force

# 4. Ключи JWT и секрет приложения
php bin/console lexik:jwt:generate-keypair --overwrite
php bin/console secrets:set APP_SECRET          # либо задайте APP_SECRET в .env.local

# 5. Данные (справочники + тестовые пользователи/тикеты) — ВНИМАНИЕ, очищает БД, см. ниже
php bin/console doctrine:fixtures:load

# 6. Администратор админ-панели
php bin/console app:create-admin --super-admin

# 7. Запуск
symfony serve -d                                # http://127.0.0.1:8000
docker compose --env-file .env.local up -d --force-recreate mercure
```

Проверка: `http://127.0.0.1:8000/api` — Swagger UI, `http://127.0.0.1:8000/login` — вход в админку.

Полезно: `symfony server:status` (запущен ли сервер), `php bin/console app:test-redis` (доступен ли Redis).

## Конфигурация

Настройки берутся из `.env`, локальные переопределения — в `.env.local` (в git не попадает, как и `config/jwt/*.pem`, `config/secrets/*`, `public/uploads/*`).

| Переменная | Назначение |
|---|---|
| `APP_ENV`, `APP_SECRET` | окружение и секрет приложения |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@127.0.0.1:5432/DBNAME?serverVersion=16&charset=utf8` |
| `REDIS_URL` | Redis: пулы кэша и счётчик просмотров тикетов |
| `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_PASSPHRASE` | ключи JWT (`lexik:jwt:generate-keypair`) |
| `REFRESH_TOKEN_TTL`, `REFRESH_TOKEN_COOKIE_*` | срок (по умолчанию 15 суток) и параметры cookie refresh-токена |
| `CORS_ALLOW_ORIGIN` | разрешённые origin'ы клиентов |
| `MAILER_DSN`, `MAILER_SENDER` | почта (в dev по умолчанию `null://null` — письма не уходят) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_API_URL` | уведомления администрации в Telegram |
| `MERCURE_URL`, `MERCURE_PUBLIC_URL`, `MERCURE_JWT_SECRET`, `MERCURE_CORS_ORIGIN` | Mercure-хаб |
| `APP_URL`, `FRONTEND_URL` | публичные адреса API и клиента (ссылки в письмах и т. п.) |

Access-токен живёт 1 час, refresh — до 15 суток. Access-токен принимается только в `Authorization: Bearer …`.

## Фикстуры и тестовые данные

### ⚠️ `doctrine:fixtures:load` очищает **всю** базу

Загрузчик всегда сначала чистит **все таблицы**, а `--group` только выбирает, что загрузить **после** очистки. Поэтому `--group=prod` (и обёртка `app:fixtures:load-prod`) сносит тестовых пользователей, тикеты, чаты, отзывы **и администратора**, оставляя одни справочники.

Если это случилось: `php bin/console app:create-admin --super-admin` и полный `php bin/console doctrine:fixtures:load`.

Правила безопасной работы:
- пробуйте загрузку фикстур на **отдельной scratch-БД**, а не на рабочей (рецепт ниже);
- хотите не стирать существующее — `--append` (но повторная загрузка создаст дубликаты справочников);
- обновить **тексты** уже существующих записей (юридические документы, описания категорий) проще в админке (`Переводы`), чем перезагружать фикстуры.

### Группы

Каждая фикстура объявляет `getGroups()`. Загрузчик сам добавляет зависимости фикстур выбранной группы.

| Группа | Что внутри | Команда |
|---|---|---|
| *(без `--group`)* | всё: справочники + тестовые данные | `doctrine:fixtures:load` |
| `prod` | справочники: категории, подкатегории, единицы, география, причины жалоб, юридические документы | `doctrine:fixtures:load --group=prod` / `app:fixtures:load-prod` |
| `dev` | тестовые пользователи, тикеты, отзывы, избранное, жалобы | `doctrine:fixtures:load --group=dev` |
| `legal` | только юридические документы (`LegalFixture`) | `doctrine:fixtures:load --group=legal --append` |

Группа по короткому имени класса (например `--group=AppealFixture`) тоже работает — её регистрирует сам загрузчик.

### Тестовые пользователи (только dev-фикстуры)

Пароль у всех — `123456`. Например, мастер `roxana@mail.pr`, клиент `suhrab@mail.pr`. Войти могут только пользователи **active + approved** — часть фикстурных пользователей неактивна намеренно.

Тестовые **тикеты создаются неодобренными** (`approved = false`) и не видны в публичных списках, пока их не одобрят в админке (или вручную в БД). Тикет виден публично, только если он одобрен **и** его публикатор (мастер для услуги, автор для запроса) active + approved.

### Scratch-БД для проверки фикстур и тестов

```bash
createdb ustoyob_scratch
export DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/ustoyob_scratch?serverVersion=16&charset=utf8"
php bin/console doctrine:schema:create
php bin/console doctrine:fixtures:load --no-interaction

# отдельный сервер на 8001, читающий эту БД
php -d variables_order=EGPCS -S 127.0.0.1:8001 -t public
```

`-d variables_order=EGPCS` обязателен: без него встроенный PHP-сервер не видит `DATABASE_URL` из окружения и молча ходит в базу из `.env.local`. В конце: остановить сервер и `dropdb ustoyob_scratch`.

### Юридические документы

Тексты лежат в `docs/legal/{tj,eng,ru}/*.md` (таджикский — оригинал и приоритетная версия, см. `docs/legal/README.md`), `LegalFixture` читает их и превращает markdown в обычный текст. Если файла нет — фикстура не падает, а подставляет короткий запасной текст и пишет предупреждение в stderr.

В текстах остались плейсхолдеры `[НАИМЕНОВАНИЕ / ФИО ОПЕРАТОРА]`, `[АДРЕС]`, `[E-MAIL ДЛЯ ОБРАЩЕНИЙ]`, `[ДАТА ВСТУПЛЕНИЯ В СИЛУ]` — заполните до загрузки на прод.

## API: соглашения

- База — `/api`. Документация: Swagger UI на `/api`, описание для фронта — [API_REFERENCE.md](API_REFERENCE.md).
- Вход: `POST /api/authentication_token` с `{"email": "...", "password": "..."}` → `token` (+ refresh в cookie). Обновление — `/api/refresh_token`, выход — `/api/invalidate_token`.
- Язык ответа: `?locale=tj|eng|ru`, по умолчанию `tj`.
- Связи в теле запроса — **IRI**, а не голый id: `{"ticket": "/api/tickets/<uuid>"}`.
- Ошибки: `{"code": "...", "message": "..."}` с HTTP-статусом; коды и тексты — `src/ApiResource/AppMessages.php`.
- **Пустые «мои»-коллекции** (`/chats/me`, `/tickets/me`, `/recently-watched`) отдают **404 `resource_not_found`**, а не `200 []`. Клиент должен трактовать это как «пусто».
- Идентификаторы — UUID (v7). У сущностей с названием есть декоративный `slug` (см. ниже).
- Пагинация: `?page=&itemsPerPage=` (для «моих»-коллекций максимум 100).
- Лимиты запросов: вход — 5/мин, отправка OTP — 3/5 мин, подтверждение аккаунта — 10/час, гостевые обращения в поддержку — 5/час (по IP).

## Ключевые механики

### Локализация (`?locale=`)

`title` и `description` справочников (категории, подкатегории, единицы, юридические документы, география) хранятся в `Translation` — по строке на язык. На чтение `LocalizationService` подставляет перевод в поля сущности.

- `localizeEntity()` — только `title`; `localizeEntityFull()` — `title` **и** `description`. Если у сущности есть переводимое описание — вызывайте **`Full`**, иначе описание останется значением по умолчанию.
- Сущности встраиваются друг в друга (тикет → категория/единица/подкатегория, пользователь → специальности, категория → специальности), и **в каждом месте встраивания** локализация вызывается отдельно (`LocalizationService::localizeTicket()/localizeUser()`, `*LocalizationProvider`, `FavoriteStateProvider`). Добавляете новое место — не забудьте `localizeEntityFull()`.
- Описание отдаётся через `strip_tags()`, поэтому в переводах хранится обычный текст без разметки.
- Отдельного «резервного» описания для редактирования в админке нет: правится только в `Переводы`.

### Слаг

`slug` — **декоративная живая проекция названия** (`SlugTrait`, `SlugUtil`): транслитерация рус/тадж → латиница. Не хранится в БД, ничего не идентифицирует и не проверяется на уникальность; сущность всегда ищется по UUID. Фронт строит ссылку `/x/{id}?slug={slug}`, бэк параметр `slug` игнорирует. Следует за `?locale=`. Есть у сущностей с `TitleTrait` и у пользователя (имя + фамилия).

### Модерация тикетов и видимость отзывов

Содержательная правка тикета (название, описание, цена, категория, адрес и т. п.) сбрасывает `approved` в `false` и отправляет тикет на повторную проверку; пока он не одобрен — он скрыт из публичных списков.

Отзывы при этом **не должны пропадать**: их видимость привязана не к живому `approved`, а к `everApproved` («хоть раз одобрен»). Оно выставляется в `Ticket::setApproved(true)` и сбрасывается только баном (`setBanned(true)`).

### Недавно просмотренные

- `POST /api/recently-watched` `{ "ticket": "<IRI>" }` — отметить просмотр (нужен Bearer). Идемпотентно: повторный просмотр обновляет `viewedAt`, тикет поднимается наверх.
- `GET /api/recently-watched` — лента текущего пользователя, новые сверху; показываются только тикеты, которые пользователь вправе видеть.
- Хранится не больше 50 последних (`RecentlyWatchedRepository::MAX_PER_OWNER`).

### Чаты

Между двумя пользователями может быть несколько чатов: общий (`ticket = null`) и по каждому объявлению. Уникальна тройка `(author, replyAuthor, ticket)`. Проверить, есть ли чат с конкретным человеком: `GET /api/chats/me?user=<uuid>` (можно комбинировать с `ticket`, `active`).

### Жалобы

Жалоба на **чат** допускает только причины с `authRequired = false` (`fraud`, `racism_nazism_xenophobia`, `other`); иначе `auth_required_for_chat_appeals`. UUID причин различаются между окружениями — берите их через `GET /api/appeal-reasons?authRequired=false`.

### Загрузки и кэш картинок

Файлы получают случайное имя (sha1) при каждой загрузке и не перезаписываются, поэтому URL в `/uploads` **неизменяем** и его можно кэшировать надолго — см. [Деплой](#деплой).

## Админ-панель

- Вход: `/login` (форма, поля `_username` / `_password`), доступ — `ROLE_SUPER_ADMIN`. Создать администратора: `php bin/console app:create-admin --super-admin`.
- Маршруты «красивые» (`/legal`, `/legal/<id>/edit`, `/tech-support`…). Адреса вида `/?crudControllerFqcn=…&crudAction=…` дают 500 «Cannot get entity outside of a CRUD context» — берите ссылки из меню.
- Переводы (название + описание по языкам) редактируются во вложенной форме «Переводы». Поле описания там — обычная `textarea`, а не WYSIWYG: редактор не инициализировался внутри `CollectionField` (см. [Проблемы](#проблемы-и-решения)).

## Тесты

```bash
php bin/phpunit
```

**Известное состояние:** сейчас 16 из 29 тестов красные — все в `AccessServiceTest`: они ждут исключения Symfony (`TokenNotFoundException`, `AccessDeniedHttpException`), а код теперь бросает `AppMessageException`. Это существующая поломка тестов, не регрессия функциональности; тесты нужно привести к новым исключениям.

## Деплой

В проекте **нет миграций** — схема обновляется командой `doctrine:schema:update`. Всегда сначала смотрите, что она собирается сделать:

```bash
composer install --no-dev --optimize-autoloader
php bin/console doctrine:schema:update --dump-sql      # прочитать SQL!
php bin/console doctrine:schema:update --force
php bin/console cache:clear --env=prod
```

`schema:update` может удалять колонки, которых уже нет в сущностях, — не применяйте вслепую.

**Справочники на проде.** `doctrine-fixtures-bundle` стоит в `require-dev`, поэтому после `composer install --no-dev` команд `doctrine:fixtures:load` и `app:fixtures:load-prod` **нет**. Первичную загрузку справочников (`prod`-группа) делайте один раз с установленными dev-зависимостями (например, на staging или временно `composer install` без `--no-dev`), помня, что загрузка **очищает всю БД** — на живой базе с данными этого делать нельзя. Дальше тексты и справочники правятся в админке.

**Разовые шаги после релизов с изменением данных**
- Появилось поле `ticket.ever_approved` (см. «Модерация тикетов»): для уже одобренных тикетов выполнить  
  `UPDATE ticket SET ever_approved = true WHERE approved = true;`
- После обновления сущностей/групп сериализации очистить кэш приложения и пулы (`cache:clear`, `cache:pool:clear cache.global_clearer`), иначе API может отдавать старую форму ответа.

**Периодические задачи (cron)**
- `php bin/console app:delete-unactivated-users` — удаляет неподтверждённые аккаунты (по умолчанию старше 7 суток; `--days=N`, `--dry-run` — показать без удаления).
- `php bin/console app:prune-entity-revisions` — чистит audit trail с истёкшим сроком (по умолчанию 14 суток).

**Кэш картинок (nginx).** По умолчанию `/uploads` отдаётся без `Cache-Control`, и WebView/браузеры перекачивают картинки. Добавьте в nginx:

```nginx
location ^~ /uploads/ {
    root /путь/к/проекту/public;
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
}
```

Нюансы: без `always`, чтобы 404 не кэшировался; `add_header` в `location` отменяет унаследованные из `server {}` (CORS, security-заголовки) — повторите их здесь; `expires` не добавляйте вместе с этим `add_header`. Проверка: `curl -sI https://<хост>/uploads/<файл> | grep -i cache-control`.

**Юридические документы** — заполните плейсхолдеры в `docs/legal` (см. выше) и убедитесь, что папка `docs/` попадает в деплой (иначе фикстура подставит короткие тексты).

## Проблемы и решения

| Симптом | Причина | Решение |
|---|---|---|
| После `fixtures:load --group=prod` пропали пользователи, тикеты, чаты, админ | Загрузчик чистит **всю** БД, группа лишь выбирает, что грузить после | `app:create-admin --super-admin`, полный `doctrine:fixtures:load`; загрузку пробовать на scratch-БД |
| Новое поле/группа (например `slug`) не появляется в ответе API, хотя код верен | Устаревший кэш метаданных сериализатора / API Platform | `php bin/console cache:clear` и `cache:pool:clear cache.global_clearer` |
| `:8000` не отвечает | Symfony-сервер не запущен (не переживает перезапуск) | `symfony server:status`, `symfony server:start -d` |
| Тест на отдельной БД всё равно ходит в основную | Встроенный PHP-сервер не видит `DATABASE_URL` из окружения | `php -d variables_order=EGPCS -S …` (см. «Scratch-БД») |
| В админке под лейблом «Описание» пусто (редактор не рисуется) | `TextEditorField` не инициализируется во вложенной форме `CollectionField` | Использовать `TextareaField` (сделано в `TranslationCrudController`); не возвращать WYSIWYG во вложенные формы |
| `?locale=` меняет `title`, но не `description` | Вызывается `localizeEntity()` вместо `localizeEntityFull()` | Использовать `localizeEntityFull()` — во всех местах встраивания сущности |
| Отзывы исчезали после правки объявления | Видимость была завязана на живой `ticket.approved`, который сбрасывается правкой | Видимость по `everApproved` (см. «Модерация»); при деплое — backfill из раздела «Деплой» |
| `401` при входе тестовым пользователем | Пользователь неактивен/не подтверждён; в админке поля `_username`/`_password`, в API — `email`/`password` | Взять active+approved пользователя (`saidakbar@mail.pr`, `suhrab@mail.pr`) |
| `400 invalid_json` при `POST` с `ticket: "<id>"` | Ожидается IRI `/api/tickets/<uuid>`; скрытый/неодобренный чужой тикет тоже не резолвится → 400 | Передавать IRI; проверить видимость тикета |
| `auth_required_for_chat_appeals` при жалобе на чат | Выбрана причина с `authRequired = true` | Причина с `authRequired = false`; UUID брать из `GET /api/appeal-reasons?authRequired=false` |
| `404 resource_not_found` на «мои»-коллекции | Коллекция пуста — так устроены self-коллекции | Обрабатывать 404 как «пусто» |
| Публичный список тикетов пуст после фикстур | Тестовые тикеты неодобрены | Одобрить в админке (публикатор должен быть active+approved) |
| Картинки перекачиваются на клиенте | Нет `Cache-Control` на `/uploads` | nginx-блок из «Деплой» |
| Админка: 500 «Cannot get entity outside of a CRUD context» | Открыт адрес вида `/?crudControllerFqcn=…` | Ходить по меню / красивым маршрутам (`/legal`) |
| Фикстура юр. документов пишет «файл … не найден» | `docs/legal` не попала в деплой/путь | Убедиться, что `docs/` на месте; иначе загрузятся короткие тексты |
| `php bin/phpunit`: 16 падений | Тесты ждут старые типы исключений | См. «Тесты»; привести тесты к `AppMessageException` |

## Документы и ссылки

- [API_REFERENCE.md](API_REFERENCE.md) — справочник API для фронтенда.
- [AGENTS.md](AGENTS.md) — архитектура и соглашения для разработчиков/агентов.
- [docs/legal/](docs/legal/) — условия использования, политика конфиденциальности, публичная оферта, права третьих лиц (tj/eng/ru).
- Лицензия — файл [LICENSE](LICENSE).
