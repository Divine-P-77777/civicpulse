'use client';

import React from 'react';

interface Session {
    SessionId: string;
    Title: string;
    CreatedAt: string;
    UpdatedAt: string;
}

interface ChatSidebarProps {
    sessions: Session[];
    activeSessionId: string | null;
    sidebarWidth: number;
    onResize: (width: number) => void;
    onCreateSession: () => void;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    user: any;
}

export default function ChatSidebar({
    sessions, activeSessionId, sidebarWidth, onResize,
    onCreateSession, onLoadSession, onDeleteSession, user
}: ChatSidebarProps) {
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = Math.max(220, Math.min(450, startWidth + (moveEvent.clientX - startX)));
            onResize(newWidth);
        };
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <aside className="relative bg-white/80 backdrop-blur-sm border-r border-gray-200/60 flex flex-col shadow-sm hidden md:flex"
            style={{ width: sidebarWidth, minWidth: 220, maxWidth: 450 }}>
            <div className="p-4 border-b border-gray-100">
                <button onClick={onCreateSession}
                    className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.2)] flex items-center justify-center gap-2">
                    ✚ New Conversation
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1" data-lenis-prevent="true">
                {sessions.map(s => (
                    <div key={s.SessionId}
                        onClick={() => onLoadSession(s.SessionId)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all ${activeSessionId === s.SessionId
                            ? 'bg-[#2A6CF0]/10 text-[#2A6CF0] font-medium'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}>
                        <div className="flex items-center gap-2 truncate flex-1">
                            <span className="text-xs">💬</span>
                            <span className="truncate">{s.Title}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.SessionId); }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#E45454] text-xs ml-2 transition">✕</button>
                    </div>
                ))}
                {sessions.length === 0 && (
                    <div className="text-center p-6"><span className="text-3xl block mb-2">📋</span><p className="text-gray-400 text-xs">No conversations yet.<br />Start by asking a question!</p></div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2A6CF0]/10 rounded-full flex items-center justify-center text-sm font-medium text-[#2A6CF0]">
                    {user?.firstName?.[0] || '👤'}
                </div>
                <div className="text-sm truncate">
                    <p className="text-gray-800 font-medium truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-gray-400 text-xs truncate">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
            </div>
            {/* Resize handle */}
            <div onMouseDown={handleMouseDown}
                className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#2A6CF0]/20 transition group">
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1 h-8 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition"></div>
            </div>
        </aside>
    );
}
