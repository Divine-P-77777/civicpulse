'use client';

import { useUser, useAuth, SignInButton } from '@clerk/nextjs';
import React, { useState, useRef, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Session {
  SessionId: string;
  Title: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export default function ChatPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');

  // Chat state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth fetch helper
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers as Record<string, string>), 'Authorization': `Bearer ${token}` },
    });
  }, [getToken]);

  // Check if user needs onboarding (no name set)
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      if (!user.firstName || !user.lastName) {
        setShowOnboarding(true);
      }
    }
  }, [isLoaded, isSignedIn, user]);

  // Load sessions
  useEffect(() => {
    if (isSignedIn) loadSessions();
  }, [isSignedIn]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Auto resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const loadSessions = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/chat/sessions`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) { console.error('Failed to load sessions:', err); }
  };

  const createSession = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/chat/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await res.json();
      setActiveSessionId(data.session_id);
      setMessages([]);
      await loadSessions();
      return data.session_id;
    } catch (err) { console.error('Failed to create session:', err); return null; }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setActiveSessionId(sessionId);
      const res = await authFetch(`${API_BASE}/api/chat/session/${sessionId}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) { console.error('Failed to load session:', err); }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this conversation?')) return;
    try {
      await authFetch(`${API_BASE}/api/chat/session/${sessionId}`, { method: 'DELETE' });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (err) { console.error('Failed to delete session:', err); }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const userMessage = input.trim();
    setInput('');

    // Auto-create session if none active
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession();
      if (!sessionId) return;
    }

    // Add user message to UI immediately
    const userMsg: Message = { role: 'user', content: userMessage, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId, message: userMessage }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                if (json.done) break;
                if (json.content) {
                  fullText += json.content;
                  setStreamingText(fullText);
                }
              } catch { }
            }
          }
        }
      }

      // Add the complete bot message
      const botMsg: Message = { role: 'assistant', content: fullText, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, botMsg]);
      setStreamingText('');
      await loadSessions(); // Refresh to update timestamps
    } catch (err: any) {
      const errorMsg: Message = { role: 'assistant', content: `Error: ${err.message}`, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, errorMsg]);
      setStreamingText('');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    try {
      const names = fullName.trim().split(' ');
      const firstName = names[0];
      const lastName = names.slice(1).join(' ') || '';
      await user?.update({ firstName, lastName });
      // Store DOB in user's unsafeMetadata
      await user?.update({ unsafeMetadata: { ...user.unsafeMetadata, dob } });
      setShowOnboarding(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  // ─── Auth Guards ───
  if (!isLoaded) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-10 text-center max-w-md shadow-xl">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-white mb-2">Sign In to Chat</h2>
          <p className="text-gray-400 mb-6">Sign in to start chatting with CivicPulse AI.</p>
          <SignInButton mode="modal">
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg shadow-blue-500/20 cursor-pointer">
              🔑 Sign In
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">👋</div>
              <h2 className="text-2xl font-bold text-white">Welcome to CivicPulse!</h2>
              <p className="text-gray-400 mt-2">Let&apos;s set up your profile quickly.</p>
            </div>
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-500/20 mt-2">
                🚀 Get Started
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar — Session List */}
      {showSidebar && (
        <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <button onClick={createSession}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2.5 rounded-lg transition flex items-center justify-center gap-2">
              ＋ New Chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map(s => (
              <div key={s.SessionId}
                onClick={() => loadSession(s.SessionId)}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${activeSessionId === s.SessionId
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}>
                <span className="truncate flex-1">{s.Title}</span>
                <button onClick={(e) => { e.stopPropagation(); deleteSession(s.SessionId); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs ml-2 transition">✕</button>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-gray-600 text-xs text-center p-4">No conversations yet</p>}
          </div>
          <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
            {user?.firstName} {user?.lastName}
          </div>
        </aside>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-900/80 border-b border-gray-800 px-6 py-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="text-gray-400 hover:text-white transition text-lg">☰</button>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">⚡</span>
            </div>
            <div>
              <h1 className="text-white font-semibold">CivicPulse AI</h1>
              <p className="text-gray-500 text-xs">Legal Rights Assistant</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome state */}
            {messages.length === 0 && !isStreaming && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl">⚖️</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">How can I help you today?</h2>
                  <p className="text-gray-400 mb-8 max-w-md">Ask me about legal rights, civic matters, or any questions about laws and regulations.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                    {['What are my fundamental rights?', 'Explain RTI Act', 'Property law basics', 'Consumer rights guide'].map((q) => (
                      <button key={q} onClick={() => setInput(q)}
                        className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white transition text-left">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-3 max-w-2xl ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user'
                      ? 'bg-blue-600'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}>
                    <span className="text-white text-xs">{msg.role === 'user' ? '👤' : '⚡'}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-md'
                    }`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-50">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Streaming response */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3 max-w-2xl">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">⚡</span>
                  </div>
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                    {streamingText ? (
                      <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">{streamingText}<span className="animate-pulse">▌</span></p>
                    ) : (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-4 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about legal matters, rights, or civic issues..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none resize-none max-h-36 min-h-[48px] transition"
            />
            <button onClick={handleSend} disabled={!input.trim() || isStreaming}
              className={`p-3 rounded-xl transition-all ${input.trim() && !isStreaming
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800 text-gray-600'
                }`}>
              {isStreaming ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                <span>➤</span>
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">CivicPulse AI can make mistakes. Verify important legal information.</p>
        </div>
      </div>
    </div>
  );
}