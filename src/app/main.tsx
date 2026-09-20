/**
 * Application entry point.
 *
 * Boot order:
 *  1. Data cache is warmed (cities, occupations, etc.)
 *     and subscribes to the global `languageChanged` event for cache invalidation.
 *  2. React tree is mounted with:
 *     - Redux `Provider` for global state
 *     - `ThemeProvider` for dark/light theme (synced with the OS theme by default)
 *     - `NetworkProvider` + `OfflineGate` — overlays a "no internet" screen app-wide
 *       whenever the device loses connectivity (see NetworkContext)
 *     - `AppRouter` with all page routes
 *
 * NOTE: React.StrictMode is temporarily disabled to prevent double-fetching
 * during development; re-enable when ready.
 */
import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import '../locales/i18n';
import {AppRouter} from "./routers";
import {store} from "./store";
import {Provider} from "react-redux";
import { ThemeProvider, NetworkProvider } from '../contexts';
import { OfflineGate } from '../widgets/OfflineGate';
import { clearCache, preloadData } from '../utils/dataCacheUtils';
import { loadAppMessages } from '../utils/appMessagesUtils';
import { isNativePlatform, initNativeOAuthDeepLinks } from '../utils/mobileOAuth';
import { initNativeChrome } from '../utils/nativeChrome';
import './styles/native.scss';

// Инициализируем кеш данных при старте приложения
clearCache('occupations');

window.addEventListener('languageChanged', () => {
    clearCache();
    setTimeout(() => { preloadData(); loadAppMessages(undefined, true); }, 100);
});

preloadData();

loadAppMessages();

// Мобильное приложение: OAuth возвращается диплинком из in-app browser — слушаем его всегда,
// а не только пока открыта модалка входа (см. utils/mobileOAuth.ts).
if (isNativePlatform()) initNativeOAuthDeepLinks();

// Мобильное приложение: безопасные зоны iOS (viewport-fit=cover + html.native-ios), см. utils/nativeChrome.ts.
initNativeChrome();

createRoot(document.getElementById('root')!).render(
    // <React.StrictMode> // Временно отключено для тестирования дубликатов
        <Provider store={store}>
            <ThemeProvider>
                <NetworkProvider>
                    <OfflineGate>
                        <AppRouter />
                    </OfflineGate>
                </NetworkProvider>
            </ThemeProvider>
        </Provider>
    // </React.StrictMode>
)