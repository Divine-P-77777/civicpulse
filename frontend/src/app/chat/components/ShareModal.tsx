'use client';

import React, { useState } from 'react';

interface ShareModalProps {
    sessionId: string;
    apiBase: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
    onClose: () => void;
}

export default function ShareModal({ sessionId, apiBase, authFetch, onClose }: ShareModalProps) {
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [copied, setCopied] = useState(false);

    const createShareLink = async () => {
        setIsCreating(true);
        try {
            const res = await authFetch(`${apiBase}/api/chat/session/${sessionId}/share`, { method: 'POST' });
            const data = await res.json();
            if (res.ok && data.share_id) {
                const link = `${window.location.origin}/chat/shared/${data.share_id}`;
                setShareLink(link);
            }
        } catch (err) {
            console.error('Failed to create share link:', err);
        } finally { setIsCreating(false); }
    };

    const copyLink = async () => {
        if (!shareLink) return;
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareWhatsApp = () => {
        if (!shareLink) return;
        window.open(`https://wa.me/?text=${encodeURIComponent(`Check out this legal chat on CivicPulse: ${shareLink}`)}`, '_blank');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100 mx-4" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-[#2A6CF0]/10 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#2A6CF0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Share Conversation</h3>
                            <p className="text-xs text-gray-500">Create a public link anyone can view</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                    </button>
                </div>

                {!shareLink ? (
                    /* Create Link */
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                        </div>
                        <p className="text-sm text-gray-600 mb-5">Anyone with the link will be able to <strong>read</strong> this conversation. They won&apos;t be able to modify it.</p>
                        <button onClick={createShareLink} disabled={isCreating}
                            className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-medium py-3 px-6 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.25)] disabled:opacity-60 flex items-center justify-center gap-2">
                            {isCreating ? (
                                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="30 70" /></svg>Creating link...</>
                            ) : (
                                <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>Create Public Link</>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Link Created */
                    <div>
                        <div className="flex items-center gap-2 p-3 bg-[#4CB782]/10 border border-[#4CB782]/30 rounded-xl mb-4">
                            <svg className="w-5 h-5 text-[#4CB782] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            <p className="text-sm text-[#3a8f65] font-medium">Public link created!</p>
                        </div>

                        {/* Link display */}
                        <div className="flex items-center gap-2 mb-4">
                            <input readOnly value={shareLink}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none truncate" />
                            <button onClick={copyLink}
                                className={`shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${copied ? 'bg-[#4CB782] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                    }`}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>

                        {/* Share options */}
                        <div className="flex gap-2">
                            <button onClick={shareWhatsApp}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] text-sm font-medium hover:bg-[#25D366]/20 transition">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" /><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" /></svg>
                                WhatsApp
                            </button>
                            <button onClick={() => { navigator.share?.({ title: 'CivicPulse Chat', url: shareLink }).catch(() => { }); }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                More
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
