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
| Картинки | Liip Imagine (GD): превью и WebP на лету; BlurHash-заглушки (`kornrunner/blurhash`) |
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

### Картинки: превью, WebP и заглушка

Файлы получают случайное имя (sha1) при каждой загрузке и не перезаписываются, поэтому URL в `/uploads` **неизменяем** и его можно кэшировать надолго.

Вместе с `image` (имя файла — как раньше) API отдаёт для каждой картинки готовые поля:

| Поле | Что это |
|---|---|
| `imageUrl` | оригинал: `/uploads/<папка>/<файл>` (клиенту больше не нужно знать папку) |
| `imageThumbnail` | WebP, длинная сторона **480 px** — ленты, карточки, аватары |
| `imageMedium` | WebP, длинная сторона **800 px** — крупное превью |
| `imageWebp` | оригинал целиком (до 2400 px) в WebP — для старых тяжёлых PNG/JPEG |
| `imageBlurhash` | строка ~28 символов для мгновенной размытой заглушки ([BlurHash](https://blurha.sh)); `null`, если ещё не посчитана |

Поля есть везде, где есть `image` (тикеты, отзывы, галереи, чаты — `MultipleImage`; аватары; категории, специальности, география) — их группы сериализации общие (`SingleImageTrait::IMAGE_GROUPS`). Все URL относительные, домен подставляет клиент. Старое поле `image` не изменилось.

**Как это работает.** Превью строит **Liip Imagine** (`config/packages/liip_imagine.yaml`) по запросу на `/media/cache/resolve/<фильтр>/uploads/<папка>/<файл>`: строит файл один раз, кладёт в `public/media/cache/<фильтр>/…` (расширение `.webp`) и отвечает редиректом на статику. Оригиналы не меняются, поэтому **старые фото работают сразу**, без миграции файлов. Редирект кэшируется на сутки (`ImageResolveCacheSubscriber`), сам итоговый файл — надолго на стороне nginx (см. [Деплой](#деплой)).

**Заглушка.** BlurHash считается один раз при загрузке (`ImageBlurhashListener` на событие Vich `POST_UPLOAD` — работает и для API, и для админки) и хранится в `imageBlurhash`. Для картинок, загруженных до релиза, — команда:

```bash
php bin/console app:images:backfill-blurhash --dry-run   # сколько записей
php bin/console app:images:backfill-blurhash --warm      # посчитать хеш + заранее построить thumb_480
```

Безопасно запускать повторно — трогает только записи без хеша. Файла на диске нет → запись пропускается.

**Как показывать на клиенте:** сначала рисуем размытую картинку из `imageBlurhash`, грузим `imageThumbnail` (в списках) или `imageMedium`/`imageUrl` (в просмотре), затем плавно подменяем. Оригинал нужен только в полноэкранной галерее.

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

### nginx (раздача, кэш картинок, превью)

Схема: nginx и php-fpm на одной машине, `root` = `public/`. Полный рабочий конфиг (изменения относительно базового Symfony-конфига помечены `# NEW`):

```nginx
server {
    include              mime.types;

    default_type         application/octet-stream;
    client_max_body_size 50M;                     # NEW: было 10M. За один запрос можно слать несколько фото
                                                  #      (imageFile[]), каждое до 10 МБ — лимит на тело запроса
                                                  #      должен быть больше суммы, иначе 413
    sendfile             on;
    gzip                 on;
    keepalive_timeout    50;
    server_name          admin.ustoyob.tj www.admin.ustoyob.tj;
    root                 /var/www/ustoyob-tj/public;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    # NEW: оригиналы фото. Имя файла — случайный sha1, при замене фото имя новое,
    #      поэтому URL неизменяем и кэшируется на год.
    location ^~ /uploads/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # NEW: превью и WebP (Liip Imagine). Готовый файл отдаём статикой с длинным
    #      кэшем; нет файла (это URL /media/cache/resolve/...) — в Symfony, он
    #      построит превью и ответит редиректом на статику.
    location ^~ /media/cache/ {
        try_files $uri /index.php$is_args$args;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    location /.well-known/mercure {
        proxy_pass http://127.0.0.1:9090;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ~ ^/index\.php(/|$) {
        include fastcgi_params;

        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;

        internal;
    }

    location ~ \.php$ {
        return 404;
    }

    error_log  /var/log/nginx/ustoyob-tj_error.log;
    access_log /var/log/nginx/ustoyob-tj_access.log;

    listen 443 ssl; # managed by Certbot
    listen [::]:443 ssl;
    http2 on;                                     # NEW: HTTP/2 (nginx >= 1.25.1) — списки грузят много превью параллельно.
                                                  #      Для старых версий: listen 443 ssl http2; вместо этой строки
    ssl_certificate /etc/letsencrypt/live/admin.ustoyob.tj/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/admin.ustoyob.tj/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = www.admin.ustoyob.tj) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = admin.ustoyob.tj) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen               80;
    server_name          admin.ustoyob.tj www.admin.ustoyob.tj;
    return 404; # managed by Certbot
}
```

**Почему именно так**
- `^~` у обоих новых `location` **обязателен**: он запрещает проверять регулярные `location`, иначе `location ~ \.php$ { return 404; }` мог бы перехватывать запросы.
- В `/media/cache/` фолбэк `try_files … /index.php` нужен для URL `…/media/cache/resolve/<фильтр>/…` — это не файл, а вызов Symfony. Иначе превью не будут строиться.
- `add_header` из `/media/cache/` не попадает на ответ PHP (он обрабатывается в `location ~ ^/index\.php`), поэтому кэш редиректа (сутки) остаётся тем, что поставил Symfony (`ImageResolveCacheSubscriber`); статичный `.webp` получает `immutable`.
- `add_header` внутри `location` **отменяет** унаследованные из `server {}` (CORS, HSTS, security-заголовки): если добавите их на уровне `server`, повторите в обоих блоках. CORS для картинок нужен только если фронт читает их через `fetch`/`canvas`.
- Не добавляйте `expires` рядом с `add_header Cache-Control` — получится два заголовка. Нет `always` намеренно: 404 не должен кэшироваться на год.

**Что ещё нужно на сервере**

```bash
# кэш превью: PHP-пользователь (пул php8.4-fpm, обычно www-data) должен писать в public/media
mkdir -p /var/www/ustoyob-tj/public/media/cache
chown -R www-data:www-data /var/www/ustoyob-tj/public/media

# в старых mime.types нет image/webp — иначе статика отдаст application/octet-stream
grep webp /etc/nginx/mime.types        # ожидается: image/webp  webp;

nginx -t && systemctl reload nginx
```

PHP (`php.ini` для fpm): **GD с WebP** (`php -r 'var_dump(function_exists("imagewebp"));'`); `memory_limit = 512M` — превью строится декодированием оригинала, и фото с камеры на 48 МП (8000×6000) не влезает в 128 МБ (тогда превью отвечает 500); `upload_max_filesize = 10M`, `post_max_size = 50M` (не меньше `client_max_body_size`), `max_file_uploads` не меньше числа фото за раз.

Каталог `public/media` — производный кэш: его можно безопасно удалить целиком, он пересоберётся по запросам (клиенты с закэшированным редиректом до суток могут получать 404 на удалённые файлы).

**Проверка после релиза**

```bash
U=https://admin.ustoyob.tj
curl -sI $U/media/cache/resolve/thumb_480/uploads/<папка>/<файл>   # 302, Cache-Control: max-age=86400, public
curl -sI <Location из ответа выше>                                  # 200, image/webp, Cache-Control: … immutable
curl -sI $U/uploads/<папка>/<файл>                                  # 200, Cache-Control: … immutable
```

После релиза с картинками: `doctrine:schema:update --force` (5 колонок `image_blurhash`), `cache:clear`, затем один раз `php bin/console app:images:backfill-blurhash --warm`.

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
| Картинки перекачиваются на клиенте | Нет `Cache-Control` на `/uploads` и `/media/cache` | Блоки `location ^~ /uploads/` и `^~ /media/cache/` из раздела «nginx» |
| Превью не строятся: `/media/cache/resolve/…` отдаёт 404 | В `location ^~ /media/cache/` нет фолбэка `try_files … /index.php`, либо запрос перехватил `location ~ \.php$` (нет `^~`) | Взять блок из раздела «nginx» целиком |
| Превью отвечает 500 на больших фото | GD не хватает `memory_limit` для декодирования оригинала (например, 48 МП) | `memory_limit = 512M` в php-fpm; проверить `public/media` на права записи |
| Статичный `.webp` отдаётся как `application/octet-stream` | В `mime.types` нет `image/webp` | Добавить `image/webp webp;` в `mime.types` (`grep webp /etc/nginx/mime.types`) |
| `413 Request Entity Too Large` при загрузке нескольких фото | `client_max_body_size` (или PHP `post_max_size`) меньше суммарного размера файлов в одном запросе | `client_max_body_size 50M`, `post_max_size = 50M` |
| Превью `/media/cache/resolve/...` анонимам отдаёт редирект на `/login` или отвечает `private, max-age=0` | Общий stateful-файервол `admin` (`pattern: ^/`) закрывал маршрут и стартовал сессию, из-за чего Symfony приписывал ответу `Cache-Control: private` | В `security.yaml` для `^/media/cache` заведён отдельный файервол `media` с `security: false`, а маршрут помечен `_stateless: true` (`config/routes/liip_imagine.yaml`) — оба нужны, не удалять. Любой новый публичный не-`/api` маршрут (картинки, файлы) заводить так же |
| WebP-превью отдаётся с `Content-Type: image/png` | Кэш-файл лежал с расширением исходника (`.png`) | Резолвер `format_extension` (`config/services.yaml` + `liip_imagine.cache`) меняет расширение на `.webp`; не убирать |
| `imageBlurhash: null` у старых фото | Хеш считается при загрузке, старые файлы его не имеют | `php bin/console app:images:backfill-blurhash` |
| Postgres не стартует после сбоя/перезагрузки: `FATAL: lock file "postmaster.pid" already exists` | Осталась мёртвая блокировка, а её PID теперь занят посторонним процессом | Убедиться, что PID из `postmaster.pid` — не postgres (`ps -p <PID>`) и postgres не запущен, затем удалить этот файл (лучше сохранив копию); Postgres сам восстановится по WAL. Для Homebrew: `/opt/homebrew/var/postgresql@16/postmaster.pid` |
| Админка: 500 «Cannot get entity outside of a CRUD context» | Открыт адрес вида `/?crudControllerFqcn=…` | Ходить по меню / красивым маршрутам (`/legal`) |
| Фикстура юр. документов пишет «файл … не найден» | `docs/legal` не попала в деплой/путь | Убедиться, что `docs/` на месте; иначе загрузятся короткие тексты |
| `php bin/phpunit`: 16 падений | Тесты ждут старые типы исключений | См. «Тесты»; привести тесты к `AppMessageException` |
| `502 Bad Gateway` на всех запросах через PHP (`/api/*`, `/`), в т. ч. через Cloudflare | nginx-воркер не может подключиться к сокету php-fpm: `Permission denied (13)` | Подробно ниже: [502 после изменения конфигурации nginx](#502-bad-gateway-после-изменения-конфигурации-nginx) |

### 502 Bad Gateway после изменения конфигурации nginx

**Симптом:** сайт возвращает `502 Bad Gateway` (в т.ч. через Cloudflare) на всех запросах, идущих через PHP-FPM (`/api/*`, `/`, и т.д.).

**Причина:** несовпадение пользователя, от имени которого запущен nginx worker-процесс, и владельца unix-сокета PHP-FPM.

- nginx worker'ы запускаются от пользователя `nginx` (директива `user nginx;` в `/etc/nginx/nginx.conf`)
- PHP-FPM пул `www` слушает сокет `/run/php/php8.4-fpm.sock` с правами `srw-rw----`, владелец `www-data:www-data` (см. `/etc/php/8.4/fpm/pool.d/www.conf`: `user`, `group`, `listen.owner`, `listen.group`)
- Поскольку `nginx` не входит в группу `www-data`, worker получал `Permission denied (13)` при коннекте к сокету → PHP-FPM не отвечал → nginx отдавал 502

**Диагностика:**

```bash
# лог конкретного вайртхоста показывает точную причину
sudo tail -n 50 /var/log/nginx/ustoyob-tj_error.log
# ищем строку вида:
# connect() to unix:/var/run/php/php8.4-fpm.sock failed (13: Permission denied)

# от какого юзера реально работают воркеры
ps aux | grep "nginx: worker"

# кому принадлежит сокет
ls -la /var/run/php/php8.4-fpm.sock
```

**Решение:** добавить пользователя nginx в группу www-data и перезапустить сервисы:

```bash
sudo usermod -aG www-data nginx
sudo systemctl restart php8.4-fpm
sudo systemctl restart nginx
```

**Проверка:**

```bash
curl -I https://admin.ustoyob.tj/
# должен вернуться 200/302, а не 502
```

**Когда может повториться:** после переустановки/обновления nginx или PHP-FPM, смены пула PHP-FPM, или если кто-то поменяет `user` в `nginx.conf` без учёта прав на сокет.

## Документы и ссылки

- [API_REFERENCE.md](API_REFERENCE.md) — справочник API для фронтенда.
- [AGENTS.md](AGENTS.md) — архитектура и соглашения для разработчиков/агентов.
- [docs/legal/](docs/legal/) — условия использования, политика конфиденциальности, публичная оферта, права третьих лиц (tj/eng/ru).
- Лицензия — файл [LICENSE](LICENSE).
