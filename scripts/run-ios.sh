#!/usr/bin/env bash
# Собирает и запускает iOS-приложение на симуляторе БЕЗ `npx cap run ios`.
#
# Зачем: `cap run ios` (native-run) после сборки пытается открыть
# /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app. В Xcode 27
# (macOS 27) этого приложения там больше нет — команда падает уже ПОСЛЕ успешной сборки:
#   ERR_UNKNOWN: There was an error opening simulator: ... Simulator.app does not exist.
# Здесь то же самое делается через xcodebuild + simctl, которые в Xcode 27 работают.
#
# Использование:
#   bash scripts/run-ios.sh                 # уже запущенный iPhone, иначе первый доступный
#   bash scripts/run-ios.sh "iPhone 17"     # по имени
#   bash scripts/run-ios.sh <UDID>          # по UDID   (или переменная IOS_SIMULATOR)
# Веб-часть (npm run build + cap sync ios) собирает npm-скрипт cap:run:ios — см. package.json.
set -euo pipefail
cd "$(dirname "$0")/.."

TARGET="${1:-${IOS_SIMULATOR:-}}"

UDID="$(xcrun simctl list devices available -j | python3 -c '
import json, sys
q = sys.argv[1]
devs = [d for runtime in json.load(sys.stdin)["devices"].values() for d in runtime]
booted = [d for d in devs if d["state"] == "Booted"]
iphones = [d for d in devs if d["name"].startswith("iPhone")]
if q:
    pool = [d for d in devs if q in (d["udid"], d["name"])]
    pool.sort(key=lambda d: d["state"] != "Booted")
else:
    pool = [d for d in booted if d["name"].startswith("iPhone")] or iphones
print(pool[0]["udid"] if pool else "")
' "$TARGET")"

if [ -z "$UDID" ]; then
  echo "Симулятор не найден (${TARGET:-любой iPhone}). Список: xcrun simctl list devices available" >&2
  exit 1
fi
echo "▶ Симулятор: $UDID"

xcrun simctl boot "$UDID" 2>/dev/null || true   # если уже запущен — simctl ругается, это нормально
xcrun simctl bootstatus "$UDID" -b >/dev/null

DERIVED="ios/DerivedData/$UDID"
echo "▶ xcodebuild…"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$DERIVED" build -quiet

APP="$DERIVED/Build/Products/Debug-iphonesimulator/App.app"
BUNDLE_ID="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")"

xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
xcrun simctl install "$UDID" "$APP"
xcrun simctl launch "$UDID" "$BUNDLE_ID"

# В Xcode ≤ 26 окно симулятора открывается так; в Xcode 27 Simulator.app нет — тогда
# устройство уже запущено и приложение стартовало, окно смотрите из Xcode.
open -a Simulator 2>/dev/null || echo "ℹ Simulator.app в этой версии Xcode отсутствует — приложение запущено на $UDID (скриншот: xcrun simctl io $UDID screenshot out.png)"
