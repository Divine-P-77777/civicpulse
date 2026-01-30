import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Document } from '@/types';

interface DocumentsState {
  documents: Document[];
  activeDocument: Document | null;
  isUploading: boolean;
  isLoading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: DocumentsState = {
  documents: [],
  activeDocument: null,
  isUploading: false,
  isLoading: false,
  error: null,
  uploadProgress: 0,
};

// Async thunks
export const uploadDocument = createAsyncThunk(
  'documents/upload',
  async (file: File, { dispatch }) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload document');
    }
    
    return response.json();
  }
);

export const loadDocuments = createAsyncThunk(
  'documents/loadAll',
  async () => {
    const response = await fetch('/api/documents/');
    
    if (!response.ok) {
      throw new Error('Failed to load documents');
    }
    
    return response.json();
  }
);

export const loadDocument = createAsyncThunk(
  'documents/loadOne',
  async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`);
    
    if (!response.ok) {
      throw new Error('Failed to load document');
    }
    
    return response.json();
  }
);

export const deleteDocument = createAsyncThunk(
  'documents/delete',
  async (documentId: string) => {
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
    
    return documentId;
  }
);

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setActiveDocument: (state, action: PayloadAction<Document | null>) => {
      state.activeDocument = action.payload;
    },
    updateUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateDocumentStatus: (state, action: PayloadAction<{ id: string; status: Document['processing_status'] }>) => {
      const document = state.documents.find(doc => doc.id === action.payload.id);
      if (document) {
        document.processing_status = action.payload.status;
      }
      if (state.activeDocument?.id === action.payload.id) {
        state.activeDocument.processing_status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Upload document
      .addCase(uploadDocument.pending, (state) => {
        state.isUploading = true;
        state.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 100;
        state.documents.unshift(action.payload);
        state.activeDocument = action.payload;
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.isUploading = false;
        state.uploadProgress = 0;
        state.error = action.error.message || 'Failed to upload document';
      })
      // Load documents
      .addCase(loadDocuments.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadDocuments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.documents = action.payload;
      })
      .addCase(loadDocuments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load documents';
      })
      // Load single document
      .addCase(loadDocument.fulfilled, (state, action) => {
        const existingIndex = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (existingIndex >= 0) {
          state.documents[existingIndex] = action.payload;
        } else {
          state.documents.push(action.payload);
        }
        state.activeDocument = action.payload;
      })
      // Delete document
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(doc => doc.id !== action.payload);
        if (state.activeDocument?.id === action.payload) {
          state.activeDocument = null;
        }
      });
  },
});

export const {
  setActiveDocument,
  updateUploadProgress,
  clearError,
  updateDocumentStatus,
} = documentsSlice.actions;

export default documentsSlice.reducer;