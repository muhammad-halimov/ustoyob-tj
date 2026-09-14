```
REACT_APP_API_BASE_URL=
```

## Mobile (Capacitor / Android) — SDK setup from scratch

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