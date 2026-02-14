import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import {AppRouter} from "./routers";
import {store} from "./store";
import {Provider} from "react-redux";
import { ThemeProvider } from '../contexts';
import { initDataCache } from '../utils/dataCacheInit';

// Инициализируем кеш данных при старте приложения
initDataCache();

createRoot(document.getElementById('root')!).render(
    // <React.StrictMode> // Временно отключено для тестирования дубликатов
        <Provider store={store}>
            <ThemeProvider>
                <AppRouter />
            </ThemeProvider>
        </Provider>
    // </React.StrictMode>
)