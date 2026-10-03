# ustoyob.tj — мобильное приложение (ветка `mobile`)

Приложение для Android и iOS на **Capacitor 8**, собранное из кода сайта [ustoyob.tj](https://ustoyob.tj). Здесь — только то, что касается приложения: сборка, нативные проекты, что приложение делает иначе, чем сайт, и известные грабли устройств.

- **Общий код, сайт и контракт с бэкендом** — README ветки `front` (быстрый старт сайта, OAuth в браузере, Telegram-боты, UUID, пагинация, формат ошибок и т.п.) и `AGENTS.md`.
- **Бэкенд** — ветка `main` (Symfony + API Platform), её README: push-уведомления (FCM), SMS-коды (Twilio).
- **Как приложение «ощущается нативным»** (keep-alive вкладок, кэш экранов, анимации, сессия, касания) — подробно в [`guides/NATIVE_FEEL_PLAN.md`](guides/NATIVE_FEEL_PLAN.md).

Изменения сайта приходят сюда слиянием `front → mobile`, обратно не мержится. Всё только для приложения — в отдельных файлах под `Capacitor.isNativePlatform()` (`utils/native*.ts`, `app/styles/native*.scss`, `TabKeepAlive`), чтобы слияния не конфликтовали. Исключение — [виджет даты рождения](#виджет-даты-рождения-srcwidgetsdatewidget--разные-реализации-на-mobile-и-front): один путь, разное содержимое.

**Стек приложения:** Capacitor 8 (Android, iOS через SwiftPM) · `@capacitor/app`, `browser`, `splash-screen`, `status-bar` и др. · `@capacitor-firebase/messaging` · `capacitor-native-settings` · свой плагин `NavigationBarPlugin` (Android).

---

## Быстрый старт

```bash
npm install
cp .env .env.local          # значения — см. «Переменные окружения»
npm run cap:run:android     # сборка → cap sync → запуск на эмуляторе/устройстве
npm run cap:run:ios         # то же для iOS (симулятор, см. разделы про iOS ниже)
```

| Команда | Что делает |
|---|---|
| `npm run build` | `prebuild` (снимок данных для первого запуска, см. ниже) + `tsc -b` + `vite build` в `dist/` |
| `npm run cap:sync` | сборка + `npx cap sync` (веб-бандл и плагины → `android/`, `ios/`) |
| `npm run cap:android` / `cap:ios` | сборка + sync + открыть проект в Android Studio / Xcode |
| `npm run cap:run:android` / `cap:run:ios` | сборка + sync + запуск |
| `npm run assets` | иконки и сплэш из `assets/` (см. «Иконка и сплэш-экран») |

**Снимок для первого запуска.** `prebuild` (`scripts/build-mobile-snapshot.mjs`) скачивает с прод-API справочники, ленту и отзывы главной на трёх языках и иконки категорий в `public/snapshot/` — самый первый запуск после установки открывается без ожидания сети (`utils/nativeSnapshot.ts`). Без сети при сборке снимок просто не обновится.

**Отладка в браузере.** `npm run dev` показывает сайт; чтобы код вёл себя как в приложении (`html.native`, анимации, keep-alive, кэш), до загрузки страницы задайте `window.CapacitorCustomPlatform = { name: 'android' }` (или `'ios'`) — так проверялись все «нативные» правки (Playwright: `addInitScript`). Нативные плагины (push, сплэш) в браузере не работают — их ошибки в консоли при такой отладке ожидаемы.

## Переменные окружения

Читаются на этапе сборки (`VITE_*`, `.env` / `.env.local`), полный список — README ветки `front`. Для приложения важны:

| Переменная | Назначение |
|---|---|
| `VITE_API_BASE_URL` | **Абсолютный** адрес бэкенда (`https://…`). Приложение работает с `https://localhost` (Android) / `capacitor://localhost` (iOS) — относительные URL и прокси Vite там не работают. |
| `VITE_APP_ORIGIN` | Публичный сайт, который открывается во встроенном браузере для входа через Google/Facebook/Instagram/Telegram и для своих страниц «в новой вкладке». По умолчанию `https://ustoyob.tj`. |
| `VITE_MERCURE_HUB_URL` | Mercure-хаб для чатов и ТП в реальном времени. |

Файлы Firebase (`google-services.json`, `GoogleService-Info.plist`) — не переменные, см. [Push-уведомления](#push-уведомления-firebase-cloud-messaging).

## Что в приложении устроено иначе, чем на сайте

| Что | Где | Коротко |
|---|---|---|
| Вкладки нижней панели не пересоздаются | `app/layouts/TabKeepAlive.tsx`, `keepAliveTabs.ts` | React `<Activity>`: вкладка монтируется один раз, скрытая — на паузе, прокрутка своя у каждой |
| Экраны открываются мгновенно | `utils/apiCache.ts`, `nativePrefetch.ts`, `nativeChatPrefetch.ts`, `nativeSnapshot.ts` | Stale-while-revalidate: последний ответ API сразу, свежий — следом; фоновая предзагрузка |
| Сплэш до первых данных | `utils/nativeSplash.ts` | Держится до `app:ready` с главной, максимум 3,5 с |
| Сессия не слетает | `utils/nativeSession.ts`, `nativeHttp.ts` | Вход, обновление токена и выход — нативными запросами (refresh-cookie в нативном хранилище; WebView межсайтовую cookie не хранит) |
| Анимации по платформе | `utils/nativeMotion.ts`, `nativeLayoutMotion.ts`, `app/styles/native-motion.scss` | Переходы экранов (Material / UIKit), модалки и меню, отклик на нажатие, перестройка блоков на месте |
| Чаты и ТП как мессенджер | `utils/nativeChat.ts`, `app/styles/native.scss` | Сообщение сразу в ленте, высоты окна под экран, клавиатура, горизонтальный режим |
| Системная «назад» | `utils/nativeBack.ts` | Сначала закрывает открытое поверх (меню, галерея, модалка, переписка), потом — экран назад |
| Ссылки | `utils/nativeLinks.ts` | Без `href` (иначе Android по долгому нажатию показывает адрес), «новая вкладка» — внутри приложения или во встроенном браузере |
| Выбор файлов | `utils/nativeFiles.ts` | Фото читается в память в момент выбора (иначе content:// «протухал» → Failed to fetch) |
| Касания | `utils/nativeTouch.ts` | Без «залипших» `:hover`/`:focus` после тапа |
| Безопасные зоны, статус-бар, масштаб | `utils/nativeChrome.ts`, `app/styles/native.scss` | См. «iOS: безопасные зоны» |
| Push | `utils/nativePush.ts`, `widgets/Banners/NativePushPrompt` | См. «Push-уведомления» |

## Вход в приложении

- **Google / Facebook / Instagram / Telegram.** `window.open` в WebView не даёт настоящего окна, а провайдеры не знают origin `https://localhost`. Приложение открывает встроенный браузер (Custom Tab / SFSafariViewController) на **публичном сайте** (`VITE_APP_ORIGIN`, `/auth/<provider>/start?mobile=1&native=2`); страница сайта (`utils/mobileOAuthHandoff.ts`) возвращает приложению `code`/`state` диплинком `tj.ustoyob.app://oauth-callback`, и приложение само делает `POST /api/auth/{provider}/callback` нативным запросом (`utils/mobileOAuth.ts`). Значит, эти страницы должны быть **задеплоены на сайт** (ветка `front`), а схема `tj.ustoyob.app` — прописана в `AndroidManifest.xml` / `Info.plist`.
- **Телефон и коды из SMS** — та же модалка входа, что на сайте (README `front` → «Вход и регистрация по телефону»). На **iOS** пришедший код система сама предлагает над клавиатурой (`autocomplete="one-time-code"`); в Android WebView подстановки кода нет — вводится вручную.
- **Выход** — без перезагрузки приложения: событие `logout` очищает кэш API, пересоздаёт вкладки, шапку и бейдж непрочитанных; устройство отписывается от push. (С перезагрузкой модалка входа на профиле моргала и открывалась дважды.)

## Горизонтальная ориентация

Телефон можно повернуть. Раскладка рассчитана на портрет, поэтому для телефона горизонтально (`orientation: landscape` и высота ≤ 540px, `app/styles/native.scss`) чаты и ТП перестраиваются: строка «город/язык/тема» скрыта, пока открыта переписка — скрыта и нижняя панель (назад — стрелкой в шапке чата или «НАЗАД»), при открытой клавиатуре на Android уходят и верхняя панель с шапками переписки. Без этого шапки (51 + 63px) и панель (54px) съедали почти всю высоту (~390px): переписка ТП сжималась до полоски. Планшеты — как в портрете.

---

## Android: SDK с нуля

Если Android SDK когда-нибудь придётся ставить заново после `brew install --cask android-commandlinetools`, вот весь чек-лист.

### 1. Установить cask

```bash
brew install --cask android-commandlinetools
```

SDK ставится в `/opt/homebrew/share/android-commandlinetools` (только `cmdline-tools`, больше ничего).

### 2. Прописать переменные окружения

В `~/.zshrc` (один раз навсегда):

```bash
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

затем `source ~/.zshrc` (или открыть новый терминал).

### 3. Принять лицензии

```bash
yes | sdkmanager --licenses --sdk_root="$ANDROID_HOME"
```

### 4. Поставить нужные пакеты

```bash
sdkmanager --sdk_root="$ANDROID_HOME" \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "emulator" \
  "system-images;android-35;google_apis;arm64-v8a"
```

(`arm64-v8a` — для Apple Silicon; на Intel Mac нужен был бы `x86_64`). Качается долго: эмулятор ~1.2GB, образ ~3.8GB.

### 5. Создать AVD

```bash
avdmanager create avd -n ustoyob_pixel7 -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7 --force
```

### 6. `local.properties` для проекта

Файл в `android/`, лежит в `.gitignore` — у каждого свой путь к SDK:

```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### 7. Запустить эмулятор

```bash
emulator -avd ustoyob_pixel7 &
```

Дождаться загрузки:

```bash
adb wait-for-device
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 1; done'
```

### 8. Собрать и задеплоить

```bash
npm run cap:run:android
```

Если попросит выбрать девайс (несколько эмуляторов/устройств), можно сразу указать:

```bash
npx cap run android --target emulator-5554
```

(id узнать через `adb devices`).

Если приложение свернулось/не в фокусе:

```bash
adb shell am start -n tj.ustoyob.app/.MainActivity
```

## Сборка APK

Собрать веб-бандл, засинкать его в нативный проект и получить `.apk`:

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

Готовый файл появится в:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Это debug-сборка — она подписана дефолтным debug-ключом Android и годится только для установки/тестирования на устройстве или эмуляторе (`adb install -r app/build/outputs/apk/debug/app-debug.apk`), но не для публикации в Google Play.

### Альтернативная сборка — свой бэкенд/домен + установка на устройство по Wi-Fi

Собрать с временным переопределением `VITE_API_BASE_URL`/`VITE_APP_ORIGIN` (например, против staging-бэкенда
или другого домена, не трогая `.env`/`.env.local`) и поставить сразу на реальное устройство, подключённое
по Wi-Fi через `adb connect`, а не через USB/эмулятор:

```bash
VITE_API_BASE_URL=https://x.x.com VITE_APP_ORIGIN=https://x.com npm run build \
  && npx cap sync android && (cd android && ./gradlew assembleDebug)
adb -s 192.168.1.1:5555 install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- `VITE_API_BASE_URL` — бэкенд, на который пойдут API-запросы (см. `src/utils/configUtils.ts`); пусто/не задано — относительные URL через dev-прокси Vite.
- `VITE_APP_ORIGIN` — домен публичного сайта, на который открывается in-app browser для OAuth (`APP_WEB_ORIGIN` в `src/utils/mobileOAuth.ts`, по умолчанию `https://ustoyob.tj`) — переопределять, если тестируете вход/привязку провайдеров против другого окружения сайта, а не прод-домена.
- `192.168.1.1:5555` — IP:порт устройства из `adb connect 192.168.1.1:5555` (Wi-Fi debugging уже включён на телефоне: Параметры разработчика → Отладка по Wi-Fi); `adb devices -l` должен показывать его до `-s`.
- Переменные окружения подставляются только на этот один запуск сборки — постоянные значения по-прежнему берутся из `.env`/`.env.local` (см. «Переменные окружения»).

Для релизной сборки (`./gradlew assembleRelease`) сначала нужен подписывающий ключ:

```bash
keytool -genkey -v -keystore ustoyob-release.keystore -alias ustoyob -keyalg RSA -keysize 2048 -validity 10000
```

и `signingConfigs` в [android/app/build.gradle](android/app/build.gradle), указывающий на этот keystore (пароли — через переменные окружения, keystore-файл — не коммитить в репозиторий).

## iOS — если `simctl` не находится

Ошибка при `npx cap run ios`:

```
[error] native-run failed with error
Unable to retrieve simulator list: xcrun: error: unable to find utility "simctl", not a developer tool or in PATH
```

значит `xcode-select` указывает на Command Line Tools, а не на полный Xcode.app, даже если Xcode уже установлен. Чинится так (нужен пароль):

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
```

Проверка:

```bash
xcodebuild -version
xcrun simctl list devices available
```

Вторая команда должна вывести список доступных симуляторов, а не ошибку.

## iOS на Xcode 27 / macOS 27 — `cap run ios` падает на Simulator.app

**Симптом.** Сборка проходит (`✔ Running xcodebuild`), а в конце:

```
✖ Deploying App.app to <UDID> - failed!
[error] ERR_UNKNOWN: There was an error opening simulator: The file
        /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app does not exist.
```

**Причина.** `npx cap run ios` (через `native-run`) после сборки открывает
`Xcode.app/Contents/Developer/Applications/Simulator.app`. В Xcode 27 этого приложения по
старому пути нет (`open -Ra Simulator` тоже его не находит). Сам симулятор и `xcrun simctl` при
этом работают — падает только этот вспомогательный шаг Capacitor, приложение собирается нормально.

**Что сделано.** `npm run cap:run:ios` теперь вызывает [`scripts/run-ios.sh`](scripts/run-ios.sh)
вместо `npx cap run ios`: собирает `xcodebuild`, ставит и запускает через `simctl` (веб-часть,
`npm run build` + `cap sync ios`, собирает сам npm-скрипт). Ничего вручную делать не нужно:

```bash
npm run cap:run:ios                                # уже запущенный iPhone, иначе первый доступный
IOS_SIMULATOR="iPhone 17" npm run cap:run:ios      # конкретный симулятор (имя или UDID)
```

Если выбранное устройство выключено, скрипт загружает его (`simctl boot`) и ждёт готовности.
Симуляторов с одним именем может быть несколько (например два «iPhone 17») — тогда передавайте UDID.
Собранная копия лежит в `ios/DerivedData/<UDID>/` (в `.gitignore`).

Если `simctl` отвечает `Mach error -308 (server died)` — упал сервис CoreSimulator (бывает на
Xcode 27, особенно когда загружено несколько симуляторов сразу): выключите симуляторы
(`xcrun simctl shutdown all`) и запустите ещё раз. Симулятор заметно грузит машину — на слабых
ноутбуках держите запущенным одно устройство.

**Окно симулятора.** В Xcode ≤ 26 скрипт откроет его через `open -a Simulator`. В Xcode 27
отдельного Simulator.app нет: приложение запускается на устройстве, но окно нужно смотреть из
Xcode (`npm run cap:ios` откроет проект, дальше Run на нужном симуляторе). Проверить, что
приложение живо, можно и без окна: `xcrun simctl io <UDID> screenshot out.png`.

**Если категории/данные на iOS не грузятся** (пустой экран вместо списка, в логе WebKit
`didFailResourceLoad`) — это не iOS-сборка, а CORS бэкенда. Страница приложения на iOS открывается с
origin **`capacitor://localhost`** (на Android — `https://localhost`), и его нужно разрешить в
`CORS_ALLOW_ORIGIN` на бэкенде:

```
CORS_ALLOW_ORIGIN='^(https?://(ustoyob\.tj|localhost|127\.0\.0\.1)(:[0-9]+)?|capacitor://localhost)$'
```

Проверка (в ответе должен быть `access-control-allow-origin: capacitor://localhost`):

```bash
curl -s -o /dev/null -D - -H "Origin: capacitor://localhost" "https://domain.com/api/categories" | grep -i access-control-allow-origin
```


## iOS: безопасные зоны (вырез, «домашняя полоска») и статус-бар

Веб-вью на iOS рисуется на весь экран, поэтому без обработки безопасных зон шапка уходит под
Dynamic Island, а нижняя панель — в скруглённые углы и «домашнюю полоску».

- `capacitor.config.ts` → `ios.contentInset: 'never'` (веб-вью на весь экран, фон страницы везде цвета темы).
- `src/utils/nativeChrome.ts` → `initNativeChrome()` в рантайме добавляет `viewport-fit=cover` и класс
  `html.native-ios` (только на iOS-приложении; `index.html` общий с сайтом, его не трогаем).
- `src/app/styles/native.scss` (подключён только в `app/main.tsx`) → отступы через
  `env(safe-area-inset-*)`: логотип ниже выреза, подложка цвета темы под статус-баром, нижняя панель —
  «плавающая» капсула с отступами по бокам и снизу (её скруглённые углы вписываются в изгиб экрана;
  панель на всю ширину давала мёртвую полосу под вкладками), под ней затухание фона; футер и
  cookie-баннер подстроены под неё. Селекторы по подстроке `[class*='_имя_']`, потому что классы CSS-модулей хешируются;
  при переименовании `mobile_header` / `mobile_super_header` / `footer` в SCSS обновите и этот файл.
- Статус-бар (`@capacitor/status-bar`) красится под тему **приложения** (`syncStatusBar` в
  `ThemeContext`), а не под системную — иначе при ручной смене темы часы сливаются с фоном.

- **Запрет масштабирования** (`initNativeChrome`, обе платформы): в meta viewport добавляются
  `maximum-scale=1, user-scalable=no`. Главная цель — iOS приближает страницу при фокусе на поле
  со шрифтом < 16px и потом оставляет её «зумнутой»; так шрифты инпутов (и дизайн) не трогаем.
- **Анимация нижней капсулы** (`native.scss`): всплытие при запуске, скользящий «пузырь» под активной
  вкладкой (позиция — по `li.active` через `:has()`, без «перелёта» — easeOutQuint), лёгкое
  «подпрыгивание» иконки, сжатие при нажатии; при `prefers-reduced-motion` отключается. Капсула
  обрезает содержимое по своей скруглённой форме (`overflow: hidden`), поэтому ничто не выходит за
  её границы; внутренний отступ равномерный — 4px со всех сторон (в общих стилях `8px 12px`). Колонки вкладок принудительно равные
  (`margin: 0 !important` — в общих стилях у них `margin-right: 30px !important`), иначе пузырь
  не совпадает с иконкой. Селекторы идут от `[class*='_mobile_header_']`, потому что класс
  `bottomHeader_navList` есть и у скрытого списка десктопной шапки.

Проверить раскладку без симулятора можно в обычном Chrome: DevTools Protocol
`Emulation.setSafeAreaInsetsOverride` (например верх 59 px, низ 34 px) + добавить на `<html>` класс
`native-ios` и `viewport-fit=cover` в meta viewport.

## Виджет даты рождения (`src/widgets/DateWidget/`) — разные реализации на `mobile` и `front`

**Важно:** это тот редкий случай, когда один и тот же файл (`DateWidget.tsx`/`.module.scss`,
плюс завязанные на него куски `ProfileHeader.module.scss`) **намеренно разного содержания**
в ветках `mobile` и `front`. При `git merge`/переносе фиксов между ветками — проверять этот
файл отдельно, не давать ему слиться автоматически.

Почему разошлись: нативный `<input type="date">` оказался неисправимо капризным сразу на
нескольких платформах, и каждый следующий CSS-фикс упирался в новый нативный баг вместо
решения предыдущего:
- пустое значение рисуется как **сегодняшняя** дата — и в десктопном Chrome, и в мобильных
  WebKit/Chromium одинаково (у `dateOfBirth` в `Auth.tsx` изначально `''`);
- у iOS вдобавок своя минимальная ширина по содержимому (переполняет форму) и схлопывающаяся
  высота при `appearance: none`;
- при фокусе/открытом инлайн-пикере браузер подсвечивает активный сегмент своим цветом
  **независимо** от `color`, который на него ни поставь — любой overlay поверх (прозрачный
  текст + подпись) в этот момент рвётся, сквозь него видно подсвеченный сегмент.

**`mobile`** (приложение): нативный `<input type="date">` остаётся единственной кликабельной
зоной (открывает системный пикер), но полностью скрыт — поверх лежит **непрозрачная** плашка
(`.display`, тот же фон/рамка, что у поля) с плейсхолдером или отформатированной датой, плюс
кнопка `Clear` (`shared/ui/Button/Clear`) — у нативного пикера нет надёжного способа очистить
дату со страницы. Именно непрозрачность (а не `color: transparent` + показ/скрытие на фокус)
и решила баг с подсветкой сегмента: снаружи физически ничего нативного не видно, в каком бы
состоянии ни был инпут.

**`front`** (сайт): решили не гнаться за платформенными багами дальше — обычный нативный
`<input type="date">`, без оверлея и Clear. Единственное, что осталось общим с `mobile`, —
выравнивание под соседние поля формы (фон/рамка/радиус/высота 42px, как у `SelectSearch`
altMode), это чисто визуальный фикс без побочных эффектов.

## Иконка и сплэш-экран приложения

Исходники лежат в [`assets/`](assets/) и превращаются во все размеры для iOS и Android
пакетом `@capacitor/assets`:

| Файл | Что это |
|---|---|
| `icon-only.png` (1024×1024, **без прозрачности** — требование iOS) | иконка iOS и обычная/круглая иконка Android |
| `icon-foreground.png` / `icon-background.png` | слои adaptive-иконки Android; знак умещается в «безопасную зону» (~66%) |
| `splash.png` / `splash-dark.png` (2732×2732) | экран запуска (светлая / тёмная тема) |

Знак — `public/img/icons/logos/LogoMobile.svg` (белый знак на брендовом синем градиенте).

```bash
npm run assets      # перегенерировать иконки и сплэш в ios/ и android/ из assets/
```

Заменили картинку в `assets/` — запустите `npm run assets` и закоммитьте изменения в `ios/` и `android/`.
Генератор может переформатировать `AndroidManifest.xml` (только пробелы/теги, смысл не меняется).

## Push-уведомления (Firebase Cloud Messaging)

Новое сообщение в чате, новый отклик на объявление и новое сообщение в обращении в техподдержку приходят push-уведомлением на Android и iOS; нажатие открывает чат или обращение. Код: `src/utils/nativePush.ts` (плагин `@capacitor-firebase/messaging`), сервер — README бэкенда (`main`) → «Push-уведомления». Пока в проекте нет файлов Firebase, приложение собирается и работает как раньше, просто без уведомлений.

Как устроено:

- Устройство регистрируется на сервере при запуске (если пользователь вошёл) и сразу после входа; разрешение на уведомления спрашивается тогда же. Отказались — над чатами и «Мои обращения» плашка «Включите уведомления» (`widgets/Banners/NativePushPrompt`): «Включить» — системный запрос, а если система больше не спрашивает (Android после двух отказов, iOS после первого) — «Открыть настройки» ведёт в настройки уведомлений приложения (`capacitor-native-settings`). Вернулись в приложение с разрешением — плашка пропадает, устройство регистрируется. При выходе из аккаунта устройство отписывается. Смена языка — перерегистрация: текст уведомлений на языке приложения.
- Пока приложение открыто, системные уведомления не показываются (сообщения и так видны в приложении).
- Одно уведомление на чат: новое сообщение заменяет предыдущее (Android `tag`, iOS `thread-id`). Android-канал — `messages` («Чаты»), значок — `res/drawable/ic_stat_notify.xml`.

Настройка (один раз):

1. [Firebase console](https://console.firebase.google.com) → создать проект → **Add app**:
   - **Android**, package name `tj.ustoyob.app` → скачать `google-services.json` → положить в `android/app/google-services.json` (gradle сам подключит плагин `google-services`, см. `android/app/build.gradle`).
   - **iOS**, bundle id `tj.ustoyob.app` → скачать `GoogleService-Info.plist` → в Xcode перетащить в группу `App` (галка **Copy items if needed**, target **App**). Просто положить файл в папку мало — он должен быть в target.
2. iOS, ключ APNs: [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) → «+» → **Apple Push Notifications service (APNs)** → скачать `.p8` (скачивается один раз). Firebase → Project settings → **Cloud Messaging** → Apple app configuration → **APNs Authentication Key** → загрузить `.p8`, указать Key ID и Team ID (`PD62HNY4L2`).
3. Xcode → target **App** → Signing & Capabilities: должны быть **Push Notifications** и **Background Modes → Remote notifications**. В проекте они уже прописаны (`App/App.entitlements`, `UIBackgroundModes` в `Info.plist`); если Xcode ругается на профиль — включите Push Notifications для App ID `tj.ustoyob.app` в Apple Developer → Identifiers. `aps-environment` = `development` в файле — при архивации для App Store Xcode сам ставит `production`.
4. Сервер: ключ сервисного аккаунта Firebase и `FIREBASE_CREDENTIALS` — см. README бэкенда.
5. `npm install && npm run build && npx cap sync` — Android/iOS проекты подхватят плагин (на iOS `cap sync` создаёт `ios/App/CapApp-SPM/symlinks/`, в git его нет).

Проверка: войти в приложение на телефоне, разрешить уведомления, свернуть приложение и написать этому пользователю с другого аккаунта (сайт или второе устройство). Push не приходят на iOS-симулятор без настроенного APNs и на Android-эмулятор без Google Play — проверяйте на устройствах.
