import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '@/types';

interface LiveState {
  isConnected: boolean;
  isVoiceActive: boolean;
  isCameraActive: boolean;
  isRecording: boolean;
  messages: ChatMessage[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
  audioLevel: number;
}

const initialState: LiveState = {
  isConnected: false,
  isVoiceActive: false,
  isCameraActive: false,
  isRecording: false,
  messages: [],
  connectionStatus: 'disconnected',
  error: null,
  audioLevel: 0,
};

const liveSlice = createSlice({
  name: 'live',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<LiveState['connectionStatus']>) => {
      state.connectionStatus = action.payload;
      state.isConnected = action.payload === 'connected';
    },
    setVoiceActive: (state, action: PayloadAction<boolean>) => {
      state.isVoiceActive = action.payload;
    },
    setCameraActive: (state, action: PayloadAction<boolean>) => {
      state.isCameraActive = action.payload;
    },
    setRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setAudioLevel: (state, action: PayloadAction<number>) => {
      state.audioLevel = action.payload;
    },
    resetLiveState: (state) => {
      state.isVoiceActive = false;
      state.isCameraActive = false;
      state.isRecording = false;
      state.messages = [];
      state.error = null;
      state.audioLevel = 0;
    },
  },
});

export const {
  setConnectionStatus,
  setVoiceActive,
  setCameraActive,
  setRecording,
  addMessage,
  clearMessages,
  setError,
  setAudioLevel,
  resetLiveState,
} = liveSlice.actions;

export default liveSlice.reducer;