import { configureStore, createSlice } from '@reduxjs/toolkit';

// Placeholder slice — replace with real feature slices as needed
const appSlice = createSlice({
    name: 'app',
    initialState: { ready: true },
    reducers: {},
});

export const store = configureStore({
    reducer: {
        app: appSlice.reducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
