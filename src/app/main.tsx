import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import {AppRouter} from "./routers";
import {store} from "./store";
import {Provider} from "react-redux";
import React from "react";
import { ThemeProvider } from '../contexts';

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <ThemeProvider>
                <AppRouter />
            </ThemeProvider>
        </Provider>
    </React.StrictMode>
)