import { configureStore } from '@reduxjs/toolkit';
import rootReducer from './rootReducer';

/** Configured Redux Toolkit store. devTools is only enabled outside production. */
export const store = configureStore({
    reducer: rootReducer,
    devTools: process.env.NODE_ENV !== 'production',
});

/** Inferred type of the full Redux state tree. Use in `useSelector` hooks. */
export type RootState = ReturnType<typeof store.getState>;

/** Inferred dispatch type. Use in `useDispatch` hooks for typed dispatch. */
export type AppDispatch = typeof store.dispatch;