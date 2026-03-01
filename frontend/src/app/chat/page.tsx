'use client';

import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { 
  uploadDocument, 
  loadDocuments, 
  setActiveDocument 
} from '@/store/slices/documentsSlice';
import { 
  sendMessage, 
  createNewConversation, 
  addMessage 
} from '@/store/slices/chatSlice';
import { 
  FileText, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Paperclip,
  Plus,
  Bot,
  User,
  Sparkles,
  Upload
} from 'lucide-react';
import { Document } from '@/types';

export default function ChatMode() {
  const dispatch = useAppDispatch();
  const documentsState = useAppSelector((state: any) => state.documents);
  const chatState = useAppSelector((state: any) => state.chat);
  
  const { documents, activeDocument, isUploading, uploadProgress } = documentsState || {};
  const { activeConversation, isLoading, isTyping } = chatState || {};

  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    dispatch(loadDocuments());
  }, [dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = `${Math.min(messageInputRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF or image file (JPEG, PNG)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      await dispatch(uploadDocument(file)).unwrap();
      dispatch(createNewConversation());
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    // Add user message to conversation
    dispatch(addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }));

    try {
      await dispatch(sendMessage({
        message,
        conversationId: activeConversation?.id,
        documentId: activeDocument?.id,
      })).unwrap();
      
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

    // textarea uses inline onKeyDown handler; removed unused handleKeyPress

  const selectDocument = (doc: Document) => {
    dispatch(setActiveDocument(doc));
    dispatch(createNewConversation());
    setShowDocumentPicker(false);
  };

  const handleQuickAction = (action: string) => {
    let quickMessage = '';
    
    switch (action) {
      case 'summarize':
        quickMessage = 'Please provide a summary of this document, highlighting the key points and main clauses.';
        break;
      case 'risks':
        quickMessage = 'What are the potential risks and red flags I should be aware of in this document?';
        break;
      case 'clauses':
        quickMessage = 'Can you explain the most important clauses in this document in simple terms?';
        break;
      default:
        return;
    }
    
    setMessage(quickMessage);
    setTimeout(() => handleSendMessage(), 100);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'processing':
        return <Loader2 size={16} className="text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  return (
    <Layout>
      <div className="h-full py-20 flex flex-col bg-gray-50">
        
        {/* ChatGPT-style Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">CivicPulse AI</h1>
                <p className="text-sm text-gray-500">Legal Assistant</p>
              </div>
            </div>
            
            {/* Document Status */}
            {activeDocument && (
              <div className="flex items-center space-x-2 text-sm">
                {getStatusIcon(activeDocument.processing_status)}
                <span className="text-gray-600 truncate max-w-48">
                  {activeDocument.filename}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-4xl mx-auto flex flex-col">
            
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              
              {/* Welcome State */}
              {(!activeConversation || activeConversation.messages.length === 0) && !activeDocument && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                      How can I help you today?
                    </h2>
                    <p className="text-gray-600 mb-8">
                      I&apos;m your AI legal assistant. Upload a document to analyze it, or ask me any legal questions.
                    </p>
                    
                    {/* Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
                      >
                        <Upload className="w-5 h-5 text-blue-500 mb-2" />
                        <div className="text-sm font-medium text-gray-900">Upload Document</div>
                        <div className="text-xs text-gray-500">Analyze legal documents</div>
                      </button>
                      
                      <button
                        onClick={() => setMessage("What are my basic legal rights as a citizen?")}
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
                      >
                        <FileText className="w-5 h-5 text-green-500 mb-2" />
                        <div className="text-sm font-medium text-gray-900">Ask Legal Question</div>
                        <div className="text-xs text-gray-500">Get legal guidance</div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Analysis State */}
              {activeDocument && (!activeConversation || activeConversation.messages.length === 0) && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    {activeDocument.processing_status === 'completed' && activeDocument.risk_assessment ? (
                      <>
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">
                          Document Analysis Complete
                        </h2>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                          <div className="flex items-center justify-center mb-3">
                            <span className={`
                              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                              ${getRiskColor(activeDocument.risk_assessment.overall_risk)}
                            `}>
                              {activeDocument.risk_assessment.overall_risk.toUpperCase()} RISK
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Found {activeDocument.risk_assessment.risky_clauses_count} potential issues to review
                          </p>
                        </div>
                        <p className="text-gray-600 mb-6">
                          Your document has been analyzed. Ask me anything about it!
                        </p>
                      </>
                    ) : (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-3">
                          Analyzing Document...
                        </h2>
                        <p className="text-gray-600">
                          I&apos;m reading through your document and identifying key clauses and potential risks.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {activeConversation && activeConversation.messages.length > 0 && (
                <div className="space-y-6">
                  {activeConversation.messages.map((msg: any) => (
                    <div key={msg.id} className="message-slide-in">
                      
                      {/* User Message */}
                      {msg.role === 'user' && (
                        <div className="flex justify-end">
                          <div className="flex items-start space-x-3 max-w-3xl">
                            <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* AI Message */}
                      {msg.role === 'assistant' && (
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-3 max-w-3xl">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                              
                              {/* Risk Assessment */}
                              {msg.risk_assessment && (
                                <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">Risk Assessment</span>
                                    <span className={`
                                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                      ${getRiskColor(msg.risk_assessment.overall_risk)}
                                    `}>
                                      {msg.risk_assessment.overall_risk}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {msg.risk_assessment.risky_clauses_count} potential issues identified
                                  </p>
                                </div>
                              )}
                              
                              {/* Legal References */}
                              {msg.legal_references && msg.legal_references.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-xs font-medium text-gray-700">Legal References:</p>
                                  {msg.legal_references.map((ref: any, refIndex: number) => (
                                    <div key={refIndex} className="text-xs bg-blue-50 border border-blue-200 rounded-lg p-2">
                                      <span className="font-medium text-blue-900">{ref.act}</span>
                                      <span className="text-blue-700"> - {ref.section}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-400 mt-3">
                                {new Date(msg.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm typing-indicator">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white px-4 py-4">
              
              {/* Quick Actions for Active Document */}
              {activeDocument && activeDocument.processing_status === 'completed' && (!activeConversation || activeConversation.messages.length === 0) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Quick actions:</p>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => handleQuickAction('summarize')}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      📄 Summarize document
                    </button>
                    <button 
                      onClick={() => handleQuickAction('risks')}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      ⚠️ Find risks
                    </button>
                    <button 
                      onClick={() => handleQuickAction('clauses')}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      📋 Explain clauses
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-end space-x-3">
                
                {/* Document/Attachment Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowDocumentPicker(!showDocumentPicker)}
                    className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  {/* Document Picker Dropdown */}
                  {showDocumentPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                      <div className="p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Documents</h3>
                        
                        {/* Upload New Document */}
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                            setShowDocumentPicker(false);
                          }}
                          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors mb-3"
                        >
                          <Plus className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                          <p className="text-sm text-gray-600">Upload new document</p>
                        </button>
                        
                        {/* Recent Documents */}
                        {documents.length > 0 && (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {documents.slice(0, 5).map((doc: any) => (
                              <button
                                key={doc.id}
                                onClick={() => selectDocument(doc)}
                                className={`
                                  w-full p-3 text-left rounded-lg border transition-colors
                                  ${activeDocument?.id === doc.id 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
                                `}
                              >
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-gray-400" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {doc.filename}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      {getStatusIcon(doc.processing_status)}
                                      <span className="text-xs text-gray-500">
                                        {new Date(doc.upload_date).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Text Input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={messageInputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={activeDocument ? "Ask about this document..." : "Ask me anything about legal matters..."}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 min-h-[48px] transition-all"
                    disabled={isLoading}
                    rows={1}
                  />
                </div>
                
                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isLoading}
                  className={`
                    p-3 rounded-full transition-all duration-200
                    ${message.trim() && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700 scale-100'
                      : 'bg-gray-100 text-gray-400 scale-95'}
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        {/* Upload Progress Overlay */}
        {isUploading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Uploading Document</h3>
                <p className="text-sm text-gray-600 mb-4">Analyzing your document...</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{uploadProgress}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Drag and Drop Overlay */}
        {dragActive && (
          <div 
            className="fixed inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center z-40"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-blue-400">
              <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Drop your document here</h3>
              <p className="text-sm text-gray-600">PDF, JPEG, PNG up to 10MB</p>
            </div>
          </div>
        )}

        {/* Click outside to close document picker */}
        {showDocumentPicker && (
          <div 
            className="fixed inset-0 z-0"
            onClick={() => setShowDocumentPicker(false)}
          />
        )}
      </div>
    </Layout>
  );
}