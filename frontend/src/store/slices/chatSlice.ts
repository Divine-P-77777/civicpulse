import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage, Conversation } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  isLoading: boolean;
  error: string | null;
  isTyping: boolean;
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  isLoading: false,
  error: null,
  isTyping: false,
};

// Async thunks
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (payload: { message: string; conversationId?: string; documentId?: string }) => {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    return response.json();
  }
);

export const loadConversations = createAsyncThunk(
  'chat/loadConversations',
  async () => {
    const response = await fetch('/api/chat/conversations');
    
    if (!response.ok) {
      throw new Error('Failed to load conversations');
    }
    
    return response.json();
  }
);

export const loadConversation = createAsyncThunk(
  'chat/loadConversation',
  async (conversationId: string) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load conversation');
    }
    
    return response.json();
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      if (state.activeConversation) {
        state.activeConversation.messages.push(action.payload);
      }
    },
    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.activeConversation = action.payload;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    createNewConversation: (state) => {
      const newConversation: Conversation = {
        id: `temp-${Date.now()}`,
        mode: 'chat',
        started_at: new Date().toISOString(),
        messages: [],
      };
      state.activeConversation = newConversation;
    },
  },
  extraReducers: (builder) => {
    builder
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isLoading = true;
        state.isTyping = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isTyping = false;
        
        // Add AI response to active conversation
        if (state.activeConversation) {
          const aiMessage: ChatMessage = {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: action.payload.message,
            timestamp: new Date().toISOString(),
            risk_assessment: action.payload.risk_assessment,
            legal_references: action.payload.legal_references,
          };
          state.activeConversation.messages.push(aiMessage);
          state.activeConversation.id = action.payload.conversation_id;
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isLoading = false;
        state.isTyping = false;
        state.error = action.error.message || 'Failed to send message';
      })
      // Load conversations
      .addCase(loadConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      })
      // Load conversation
      .addCase(loadConversation.fulfilled, (state, action) => {
        state.activeConversation = action.payload;
      });
  },
});

export const {
  addMessage,
  setActiveConversation,
  setTyping,
  clearError,
  createNewConversation,
} = chatSlice.actions;

export default chatSlice.reducer;