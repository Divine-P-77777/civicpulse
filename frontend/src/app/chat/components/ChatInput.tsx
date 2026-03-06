'use client';

import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useRouter } from 'next/navigation';

interface ChatInputProps {
    value: string;
    onChange: (val: string) => void;
    onSend: (file?: File | null) => void;
    isStreaming: boolean;
    isUploading: boolean;
}

export interface ChatInputHandle {
    setPendingFile: (file: File) => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
    { value, onChange, onSend, isStreaming, isUploading }, ref
) {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const router = useRouter();

    // Expose setPendingFile to parent via ref
    useImperativeHandle(ref, () => ({
        setPendingFile: (file: File) => {
            if (isAllowed(file)) setPendingFile(file);
        },
    }));

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
        }
    }, [value]);

    // Generate preview URL for images
    useEffect(() => {
        if (pendingFile && pendingFile.type.startsWith('image/')) {
            const url = URL.createObjectURL(pendingFile);
            setImagePreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setImagePreviewUrl(null);
        return undefined;
    }, [pendingFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isAllowed(file)) setPendingFile(file);
        if (fileRef.current) fileRef.current.value = '';
    };

    const isAllowed = (file: File) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.type)) { alert('Please upload a PDF or image file.'); return false; }
        if (file.size > 15 * 1024 * 1024) { alert('File must be under 15MB.'); return false; }
        return true;
    };

    const handleSend = () => {
        if ((!value.trim() && !pendingFile) || isStreaming) return;
        onSend(pendingFile);
        setPendingFile(null);
        setImagePreviewUrl(null);
    };

    const isPdf = pendingFile?.type === 'application/pdf';

    return (
        <div className="shrink-0 px-3 pb-3 pt-2 md:px-6 md:pb-5 md:pt-3">
            <div className="max-w-3xl mx-auto">

                {/* Attachment Preview */}
                {pendingFile && (
                    <div className="mb-2 inline-flex items-start gap-2 p-2 bg-white border border-gray-200 rounded-xl shadow-sm max-w-xs">
                        {isPdf ? (
                            <div className="w-10 h-12 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-6 text-red-500" viewBox="0 0 24 32" fill="currentColor">
                                    <path d="M0 4C0 1.8 1.8 0 4 0h10l10 10v18c0 2.2-1.8 4-4 4H4c-2.2 0-4-1.8-4-4V4z" opacity="0.15" />
                                    <path d="M14 0l10 10h-6c-2.2 0-4-1.8-4-4V0z" opacity="0.3" />
                                    <text x="12" y="24" textAnchor="middle" fontSize="8" fontWeight="bold" fill="currentColor">PDF</text>
                                </svg>
                            </div>
                        ) : (
                            imagePreviewUrl && (
                                <img src={imagePreviewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                            )
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{pendingFile.name}</p>
                            <p className="text-xs text-gray-400">{(pendingFile.size / 1024).toFixed(0)} KB</p>
                        </div>
                        <button onClick={() => { setPendingFile(null); setImagePreviewUrl(null); }}
                            className="shrink-0 p-1 text-gray-400 hover:text-[#E45454] hover:bg-red-50 rounded-lg transition" title="Remove">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}

                {/* Input Bar */}
                <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.06)] w-full max-w-full overflow-hidden">
                    <button onClick={() => fileRef.current?.click()}
                        disabled={isUploading || isStreaming}
                        className="shrink-0 p-2 text-gray-400 hover:text-[#2A6CF0] hover:bg-[#2A6CF0]/5 rounded-xl transition-all disabled:opacity-40"
                        title="Attach PDF or image">
                        {isUploading ? (
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="30 70" /></svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                        )}
                    </button>

                    <textarea
                        ref={inputRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder="Ask about your legal rights..."
                        rows={1}
                        disabled={isStreaming}
                        className="flex-1 w-full min-w-0 bg-transparent text-gray-900 text-sm placeholder-gray-400 outline-none border-none resize-none max-h-36 min-h-[36px] py-1.5 leading-relaxed break-words focus:border-none"
                    />

                    <button onClick={handleSend} disabled={(!value.trim() && !pendingFile) || isStreaming}
                        className={`shrink-0 p-2 rounded-xl transition-all ${(value.trim() || pendingFile) && !isStreaming
                            ? 'bg-[#2A6CF0] text-white shadow-[0_2px_8px_rgba(42,108,240,0.3)] hover:bg-[#2259D6]'
                            : 'bg-gray-100 text-gray-400'
                            }`}>
                        {isStreaming ? (
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="30 70" /></svg>
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                        )}
                    </button>

                    {/* Live Mode Microphone Button */}
                    <button onClick={() => router.push('/live')} disabled={isStreaming}
                        className="shrink-0 p-2 text-gray-400 hover:text-[#4CB782] hover:bg-[#4CB782]/10 rounded-xl transition-all disabled:opacity-40 ml-1"
                        title="Start Live Voice Mode">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-2 hidden md:block">CivicPulse AI provides general guidance. Always consult a qualified lawyer for specific legal advice.</p>
            </div>

            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
        </div>
    );
});

export default ChatInput;
