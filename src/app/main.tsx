import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import {AppRouter} from "./routers";
import {store} from "./store";
import {Provider} from "react-redux";
import React from "react";

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <AppRouter />
        </Provider>
    </React.StrictMode>
)
