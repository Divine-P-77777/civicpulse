import { useState, useEffect, useCallback, useRef } from 'react';

export interface Attachment {
    file_name: string;
    file_url: string;
    file_type: string;
}

export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    attachment?: Attachment;
}

export interface Session {
    SessionId: string;
    Title: string;
    CreatedAt: string;
    UpdatedAt: string;
}

interface UseChatParams {
    apiBase: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    getToken: () => Promise<string | null>;
    isSignedIn: boolean;
    language: 'en' | 'hi';
}

export function useChat({ apiBase, authFetch, getToken, isSignedIn, language }: UseChatParams) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Initial load and URL sync
    useEffect(() => {
        if (!isSignedIn) return;
        const loadInitialSessions = async () => {
            const res = await authFetch(`${apiBase}/api/chat/sessions`);
            if (res.ok) setSessions((await res.json()).sessions || []);
        };
        loadInitialSessions();
    }, [isSignedIn, authFetch, apiBase]);

    useEffect(() => {
        if (!isSignedIn) return;
        const pathParts = window.location.pathname.split('/');
        const urlSessionId = pathParts.length >= 3 && pathParts[1] === 'chat' ? pathParts[2] : null;
        if (urlSessionId && urlSessionId !== activeSessionId) {
            loadSession(urlSessionId);
        }
        const handlePop = () => {
            const parts = window.location.pathname.split('/');
            const sid = parts.length >= 3 && parts[1] === 'chat' ? parts[2] : null;
            if (sid) loadSession(sid);
            else { setActiveSessionId(null); setMessages([]); }
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, [isSignedIn, activeSessionId]);

    const loadSessions = useCallback(async () => {
        try {
            const res = await authFetch(`${apiBase}/api/chat/sessions`);
            if (res.ok) setSessions((await res.json()).sessions || []);
        } catch (err) { }
    }, [apiBase, authFetch]);

    const loadSession = useCallback(async (sessionId: string) => {
        try {
            setActiveSessionId(sessionId);
            window.history.pushState(null, '', `/chat/${sessionId}`);
            const res = await authFetch(`${apiBase}/api/chat/session/${sessionId}`);
            if (res.ok) setMessages((await res.json()).messages || []);
        } catch (err) { }
    }, [apiBase, authFetch]);

    const createSession = useCallback(async () => {
        try {
            const res = await authFetch(`${apiBase}/api/chat/session`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'New Chat' }),
            });
            const data = await res.json();
            setActiveSessionId(data.session_id);
            setMessages([]);
            window.history.pushState(null, '', `/chat/${data.session_id}`);
            await loadSessions();
            return data.session_id;
        } catch { return null; }
    }, [apiBase, authFetch, loadSessions]);

    const deleteSession = useCallback(async (sessionId: string) => {
        if (!confirm('Delete this conversation?')) return;
        try {
            await authFetch(`${apiBase}/api/chat/session/${sessionId}`, { method: 'DELETE' });
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([]);
                window.history.pushState(null, '', '/chat');
            }
            await loadSessions();
        } catch { }
    }, [apiBase, authFetch, activeSessionId, loadSessions]);

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setToast({ message: `Uploading ${file.name}...`, type: 'info' });
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('metadata', JSON.stringify({ type: 'user_upload', source: 'chat' }));
            const res = await authFetch(`${apiBase}/api/chat/upload`, { method: 'POST', body: formData });
            if (res.ok) {
                setToast({ message: `✅ ${file.name} uploaded! Processing in background...`, type: 'success' });
            } else {
                const data = await res.json();
                setToast({ message: `❌ Upload failed: ${data.detail || 'Unknown error'}`, type: 'error' });
            }
        } catch (err: any) {
            setToast({ message: `❌ Upload error: ${err.message}`, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSend = async (file?: File | null) => {
        if ((!input.trim() && !file) || isStreaming) return;
        const userMessage = input.trim();
        setInput('');

        if (file) uploadFile(file);

        let sessionId = activeSessionId;
        if (!sessionId) {
            sessionId = await createSession();
            if (!sessionId) return;
        }

        if (!userMessage) return;

        // Intent detection for draft creation
        const draftRegex = /\b(?:create|make|write|generate|draft)\b.*\b(?:draft|complaint|notice|letter|document)\b/i;
        if (draftRegex.test(userMessage) || userMessage.toLowerCase().startsWith('draft')) {
            window.location.href = `/draftcreation?topic=${encodeURIComponent(userMessage)}&source=chat`;
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);
        setIsStreaming(true);
        setStreamingText('');

        try {
            const startTime = performance.now();
            let ttft: number | null = null;
            let firstTokenReceived = false;

            const token = await getToken();
            const response = await fetch(`${apiBase}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ session_id: sessionId, message: userMessage, language }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.done) break;
                            if (data.content) {
                                if (!firstTokenReceived) {
                                    ttft = performance.now() - startTime;
                                    firstTokenReceived = true;
                                }
                                fullContent += data.content;
                                setStreamingText(fullContent);
                            }
                        } catch (e) {
                            console.warn("Error parsing stream chunk", e);
                        }
                    }
                }
            }

            const totalLatency = performance.now() - startTime;

            // Log Benchmark
            console.log(
                `%c ⚡ CivicPulse AI Benchmark [Chat Mode] %c TTFT: ${ttft ? (ttft / 1000).toFixed(2) : 'N/A'}s | Total: ${(totalLatency / 1000).toFixed(2)}s `,
                'background: #4f46e5; color: #fff; font-weight: bold; padding: 2px 4px; border-radius: 3px 0 0 3px;',
                'background: #1e293b; color: #fff; padding: 2px 4px; border-radius: 0 3px 3px 0;'
            );

            setMessages(prev => [...prev, { role: 'assistant', content: fullContent, timestamp: new Date().toISOString() }]);
            setStreamingText('');
            await loadSessions();
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date().toISOString() }]);
        } finally {
            setIsStreaming(false);
            setStreamingText('');
        }
    };

    return {
        sessions, activeSessionId, messages,
        input, setInput,
        isStreaming, streamingText,
        isUploading,
        toast, setToast,
        loadSession, createSession, deleteSession,
        handleSend
    };
}
