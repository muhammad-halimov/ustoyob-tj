import { combineReducers } from '@reduxjs/toolkit';

// Placeholder reducer — no real slices exist yet.
// When you add a Redux slice, import its reducer here and add it as a key.
// Example:
//   import ticketsReducer from '../../entities/store/ticketsSlice';
//   tickets: ticketsReducer,
const tempReducer = (state = {}) => state;

const rootReducer = combineReducers({
    temp: tempReducer,
});

export default rootReducer;