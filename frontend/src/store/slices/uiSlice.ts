import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  language: string;
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  currentMode: 'live' | 'chat' | 'home';
  notifications: Notification[];
  isLoading: boolean;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  autoClose?: boolean;
}

const initialState: UIState = {
  language: 'en',
  theme: 'light',
  sidebarOpen: false,
  currentMode: 'home',
  notifications: [],
  isLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setCurrentMode: (state, action: PayloadAction<'live' | 'chat' | 'home'>) => {
      state.currentMode = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}`,
        timestamp: new Date().toISOString(),
        autoClose: action.payload.autoClose ?? true,
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setLanguage,
  setTheme,
  toggleSidebar,
  setSidebarOpen,
  setCurrentMode,
  addNotification,
  removeNotification,
  clearNotifications,
  setLoading,
} = uiSlice.actions;

export default uiSlice.reducer;