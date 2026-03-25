'use client';

import { useUser, useAuth, SignInButton } from '@clerk/nextjs';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, FileText } from 'lucide-react';

import ChatHeader from './components/ChatHeader';
import ChatSidebar from './components/ChatSidebar';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import type { ChatInputHandle } from './components/ChatInput';
import OnboardingModal from './components/OnboardingModal';
import WelcomeScreen from './components/WelcomeScreen';
import ShareModal from './components/ShareModal';
import MobileHistoryModal from './components/MobileHistoryModal';
import { AIResponseTyping } from '@/app/chat/components/AIResponseTyping';

import { useChat } from '@/hooks/useChat';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function ChatPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();

    const [showOnboarding, setShowOnboarding] = useState(false);
    const [fullName, setFullName] = useState('');

    const [showShareModal, setShowShareModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [language, setLanguage] = useState<'en' | 'hi'>('en');

    const [showSidebar, setShowSidebar] = useState(true);
    const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const [dragOver, setDragOver] = useState(false);
    const dragCounter = useRef(0);
    const chatInputRef = useRef<ChatInputHandle>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        return fetch(url, {
            ...options,
            headers: { ...(options.headers as Record<string, string>), 'Authorization': `Bearer ${token}` },
        });
    }, [getToken]);

    const {
        sessions, activeSessionId, messages,
        input, setInput, isStreaming, streamingText,
        isUploading, toast, setToast,
        loadSession, createSession, deleteSession, handleSend
    } = useChat({
        apiBase: API_BASE,
        authFetch,
        getToken,
        isSignedIn: !!isSignedIn,
        language
    });

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(t);
    }, [toast, setToast]);

    useEffect(() => {
        if (isLoaded && isSignedIn && user && (!user.firstName || !user.lastName)) setShowOnboarding(true);
    }, [isLoaded, isSignedIn, user]);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        // Smoothly bring the new element into view
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }, [messages.length, isStreaming]);

    const handleOnboardingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim()) return;
        try {
            const names = fullName.trim().split(' ');
            await user?.update({ firstName: names[0], lastName: names.slice(1).join(' ') || '' });
            setShowOnboarding(false);
        } catch { }
    };

    if (!isLoaded) {
        return (
            <div className="h-[100dvh] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="w-10 h-10 border-3 border-[#2A6CF0] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="h-[100dvh] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-5"><Scale size={32} className="text-[#2A6CF0]" strokeWidth={1.5} /></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to CivicPulse</h2>
                    <p className="text-gray-500 mb-6">Sign in to get free legal guidance.</p>
                    <SignInButton mode="modal">
                        <button className="bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.3)] cursor-pointer">Sign In</button>
                    </SignInButton>
                </div>
            </div>
        );
    }

    const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setDragOver(true); };
    const onDragOverPage = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current <= 0) { dragCounter.current = 0; setDragOver(false); } };
    const onDropPage = (e: React.DragEvent) => { e.preventDefault(); dragCounter.current = 0; setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) chatInputRef.current?.setPendingFile(f); };

    return (
        <div className="h-screen flex overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}
            onDragEnter={onDragEnter} onDragOver={onDragOverPage} onDragLeave={onDragLeave} onDrop={onDropPage}>

            {dragOver && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ background: 'rgba(42,108,240,0.06)', backdropFilter: 'blur(2px)' }}>
                    <div className="bg-white rounded-3xl p-10 text-center border-2 border-dashed border-[#2A6CF0] shadow-2xl" style={{ animation: 'fadeIn 0.15s ease-out' }}>
                        <FileText size={48} className="text-[#2A6CF0] mx-auto mb-3" strokeWidth={1.5} />
                        <p className="text-gray-900 font-semibold text-lg">Drop your file here</p>
                        <p className="text-gray-500 text-sm mt-1">PDF, JPEG, PNG up to 15MB</p>
                    </div>
                </div>
            )}

            {showOnboarding && <OnboardingModal fullName={fullName} onNameChange={setFullName} onSubmit={handleOnboardingSubmit} />}

            {/* Automatic Hover Sidebar Trigger (Desktop Only) */}
            {!showSidebar && (
                <div
                    className="absolute left-0 top-16 bottom-0 w-6 z-40 hidden md:block cursor-e-resize pointer-events-auto"
                    onMouseEnter={() => setIsHoveringSidebar(true)}
                />
            )}

            <ChatSidebar
                sessions={sessions} activeSessionId={activeSessionId} sidebarWidth={sidebarWidth}
                onResize={setSidebarWidth} onCreateSession={createSession}
                onLoadSession={loadSession} onDeleteSession={deleteSession} user={user}
                showSidebar={showSidebar}
                isHovering={isHoveringSidebar}
                onMouseLeave={() => { if (!showSidebar) setIsHoveringSidebar(false); }}
                onToggleSidebar={() => setShowSidebar(!showSidebar)}
            />

            <div className={`flex-1 flex flex-col min-w-0 min-h-0 z-10 w-full transition-all duration-300 ${!showSidebar ? 'md:ml-[64px]' : ''}`}>
                <ChatHeader showSidebar={showSidebar} onToggleSidebar={() => setShowSidebar(!showSidebar)}
                    hasActiveSession={!!activeSessionId} onShareClick={() => setShowShareModal(true)}
                    onHistoryClick={() => setShowHistoryModal(true)}
                    language={language} onLanguageChange={setLanguage}
                    title={sessions.find(s => s.SessionId === activeSessionId)?.Title} />

                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-6 pb-12" data-lenis-prevent="true" style={{ overflowAnchor: 'auto' }}>
                    <div className="max-w-3xl mx-auto space-y-5 pb-32">
                        {messages.length === 0 && !isStreaming && <WelcomeScreen onSetInput={setInput} />}

                        {messages.map((msg, i) => (
                            <ChatMessage key={`${i}-${msg.timestamp}`} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
                        ))}

                        {isStreaming && streamingText === '' && (
                            <div className="flex justify-start w-full mb-4 message-slide-in">
                                <div className="flex items-start gap-3 max-w-[calc(100vw-2.5rem)] md:max-w-2xl">
                                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br from-[#2A6CF0] to-[#4CB782]">
                                        <Scale size={18} className="text-white" />
                                    </div>
                                    <div className="rounded-2xl px-5 py-4 bg-white border border-gray-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] rounded-bl-md flex items-center gap-1.5 h-[42px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        {isStreaming && streamingText !== '' && (
                            <ChatMessage role="assistant" content={streamingText} timestamp={new Date().toISOString()} isStreaming={true} />
                        )}
                    </div>
                </div>

                {toast && (
                    <div className={`mx-auto max-w-3xl mb-2 px-4 py-2.5 rounded-xl text-sm flex items-center justify-between shadow-sm border animate-[slideInUp_0.2s_ease-out] ${toast.type === 'success' ? 'bg-[#4CB782]/10 border-[#4CB782]/30 text-[#3a8f65]' : toast.type === 'error' ? 'bg-[#E45454]/10 border-[#E45454]/30 text-[#c03c3c]' : 'bg-[#2A6CF0]/10 border-[#2A6CF0]/30 text-[#2259D6]'}`}>
                        <span>{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-3 text-current opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                <ChatInput
                    ref={chatInputRef}
                    value={input} onChange={setInput} onSend={handleSend}
                    isStreaming={isStreaming} isUploading={isUploading}
                />
            </div>

            {showShareModal && activeSessionId && (
                <ShareModal sessionId={activeSessionId} apiBase={API_BASE} authFetch={authFetch} onClose={() => setShowShareModal(false)} />
            )}

            {showHistoryModal && (
                <MobileHistoryModal sessions={sessions} activeSessionId={activeSessionId} onLoadSession={loadSession} onDeleteSession={deleteSession} onClose={() => setShowHistoryModal(false)} />
            )}
        </div>
    );
}