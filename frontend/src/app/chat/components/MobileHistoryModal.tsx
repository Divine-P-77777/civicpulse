'use client';

import React from 'react';

interface Session {
    SessionId: string;
    Title: string;
    CreatedAt: string;
}

interface MobileHistoryModalProps {
    sessions: Session[];
    activeSessionId: string | null;
    onLoadSession: (id: string) => Promise<void>;
    onDeleteSession: (id: string) => Promise<void>;
    onClose: () => void;
}

export default function MobileHistoryModal({ sessions, activeSessionId, onLoadSession, onDeleteSession, onClose }: MobileHistoryModalProps) {
    // Group sessions by date
    const grouped = sessions.reduce((acc, session) => {
        const date = new Date(session.CreatedAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let group = 'Older';
        if (date.toDateString() === today.toDateString()) group = 'Today';
        else if (date.toDateString() === yesterday.toDateString()) group = 'Yesterday';
        else if (today.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) group = 'Previous 7 Days';

        if (!acc[group]) acc[group] = [];
        acc[group].push(session);
        return acc;
    }, {} as Record<string, Session[]>);

    const groupOrder = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="w-full h-[85vh] sm:h-auto sm:max-h-[80vh] sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transform transition-transform animate-slide-up sm:animate-fade-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6" data-lenis-prevent="true">
                    {sessions.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                            </div>
                            <p className="text-sm text-gray-500">No chat history yet</p>
                        </div>
                    ) : (
                        groupOrder.map(group => grouped[group] && (
                            <div key={group}>
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">{group}</h3>
                                <div className="space-y-1">
                                    {grouped[group].map(session => (
                                        <div key={session.SessionId} className={`group flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${session.SessionId === activeSessionId ? 'bg-[#2A6CF0]/5' : 'hover:bg-gray-50'
                                            }`} onClick={() => { onLoadSession(session.SessionId); onClose(); }}>
                                            <div className="flex items-center gap-3 overflow-hidden flex-1 select-none">
                                                <svg className={`w-4 h-4 shrink-0 ${session.SessionId === activeSessionId ? 'text-[#2A6CF0]' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                <span className={`text-sm truncate ${session.SessionId === activeSessionId ? 'text-[#2A6CF0] font-medium' : 'text-gray-700'}`}>{session.Title}</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.SessionId); }}
                                                className="p-1.5 text-gray-400 hover:text-[#E45454] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Delete chat">
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
