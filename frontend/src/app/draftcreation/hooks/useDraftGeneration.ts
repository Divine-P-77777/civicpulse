import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { API_BASE, DRAFT_TYPES } from '../constants';

interface UseDraftGenerationProps {
    topic: string;
    draftType: string;
    additionalContext: string;
    language?: string;
    useProfile?: boolean;
    onSuccess: (content: string) => void;
}

export function useDraftGeneration({ topic, draftType, additionalContext, language = 'en', useProfile = true, onSuccess }: UseDraftGenerationProps) {
    const { getToken, isSignedIn } = useAuth();
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [error, setError] = useState<string | null>(null);

    const generateDraft = async () => {
        if (!topic.trim()) return;
        
        setIsGenerating(true);
        setStreamingContent('');
        setError(null);

        try {
            const token = isSignedIn ? await getToken() : null;
            if (!token) {
                throw new Error("Authentication session expired. Please sign in again.");
            }

            const selectedType = DRAFT_TYPES.find(t => t.id === draftType);
            
            // If we have a rich context from Live Mode (advocate brief), use it as the primary instruction.
            // Otherwise fall back to a plain topic-based request.
            const prompt = additionalContext && additionalContext.trim().length > 50
                ? `${additionalContext}\n\nDocument Type: ${selectedType?.label || 'Legal Document'}\nTopic: ${topic}`
                : `Please draft a professional ${selectedType?.label || 'Legal Document'} regarding the following:\n\nTopic: ${topic}\n\nContext: ${additionalContext || 'None provided. Use standard format with placeholders.'}`;
            
            console.log("[Frontend Draft] Prompt source:", additionalContext?.length > 50 ? "Live Mode brief" : "Direct input");

            const headers: Record<string, string> = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // 1. Create Session
            let sessionId = `draft_${Date.now()}`;
            try {
                const sessRes = await fetch(`${API_BASE}/api/drafts/session`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ title: `${selectedType?.label || 'Draft'} Document` })
                });
                if (sessRes.ok) {
                    const data = await sessRes.json();
                    sessionId = data.session_id;
                    console.log("[Frontend Draft] Session created:", sessionId);
                }
            } catch (e) {
                console.warn("[Frontend Draft] Continuing with local session ID due to backend error", e);
            }

            // 2. Start Stream
            console.log(`[Frontend Draft] Opening stream to ${API_BASE}/api/drafts/stream`);
            const response = await fetch(`${API_BASE}/api/drafts/stream`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    session_id: sessionId,
                    message: prompt,
                    language: language,
                    topic: topic,
                    draft_type: draftType,
                    type_label: DRAFT_TYPES.find(t => t.id === draftType)?.label || 'Draft',
                    use_profile: useProfile
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                console.error("[Frontend Draft] Stream request failed:", errData);
                throw new Error(errData.detail || 'Generation failed. Please try again.');
            }

            if (!response.body) throw new Error('Readable stream not supported');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let full = '';
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        try {
                            const dataStr = line.trim().slice(6);
                            if (dataStr === '[DONE]') {
                                console.log("[Frontend Draft] Received [DONE] signal");
                                break;
                            }
                            
                            const data = JSON.parse(dataStr);
                            if (data.done) {
                                console.log("[Frontend Draft] Received done: true");
                                break;
                            }
                            if (data.error) throw new Error(data.content || 'Remote generation error');
                            if (data.content) {
                                // console.log("[Frontend Draft] Received chunk:", data.content);
                                full += data.content;
                                setStreamingContent(full);
                            }
                        } catch (e: any) {
                          if (e.message?.includes('Remote generation error')) throw e;
                          // Ignore generic JSON parse errors; the data might be split incorrectly
                        }
                    }
                }
            }

            console.log("[Frontend Draft] Generation complete. Total length:", full.length);
            onSuccess(full);
        } catch (err: any) {
            console.error('[Frontend Draft] Generation error:', err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };

    return {
        isGenerating,
        streamingContent,
        error,
        generateDraft,
        resetError: () => setError(null)
    };
}
