import { combineReducers } from '@reduxjs/toolkit';

// Временный пустой редюсер
const tempReducer = (state = {}) => state;

const rootReducer = combineReducers({
    temp: tempReducer,
});

export default rootReducer;