/**
 * Application entry point.
 *
 * Boot order:
 *  1. Data cache is warmed (cities, occupations, etc.)
 *     and subscribes to the global `languageChanged` event for cache invalidation.
 *  2. React tree is mounted with:
 *     - Redux `Provider` for global state
 *     - `ThemeProvider` for dark/light theme from localStorage
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
import { ThemeProvider } from '../contexts';
import { clearCache, preloadData } from '../utils/dataCacheUtils';
import { loadAppMessages } from '../utils/appMessagesUtils';

// Инициализируем кеш данных при старте приложения
clearCache('occupations');
window.addEventListener('languageChanged', () => {
    clearCache();
    setTimeout(() => { preloadData(); loadAppMessages(undefined, true); }, 100);
});
preloadData();
loadAppMessages();

createRoot(document.getElementById('root')!).render(
    // <React.StrictMode> // Временно отключено для тестирования дубликатов
        <Provider store={store}>
            <ThemeProvider>
                <AppRouter />
            </ThemeProvider>
        </Provider>
    // </React.StrictMode>
)