'use client';

import React from 'react';
import { MessageSquare, ClipboardList, User } from 'lucide-react';

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
    showSidebar?: boolean;
    isHovering?: boolean;
    onMouseLeave?: () => void;
    onToggleSidebar?: () => void;
}

export default function ChatSidebar({
    sessions, activeSessionId, sidebarWidth, onResize,
    onCreateSession, onLoadSession, onDeleteSession, user,
    showSidebar = true, isHovering = false, onMouseLeave, onToggleSidebar
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
        <aside 
            className={`bg-white/90 backdrop-blur-xl border-r border-gray-200/60 flex flex-col shadow-sm hidden md:flex z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                showSidebar 
                    ? 'relative translate-x-0' 
                    : `absolute left-0 top-0 bottom-0 shadow-[8px_0_30px_rgba(0,0,0,0.12)] ${isHovering ? 'translate-x-0' : '-translate-x-[calc(100%-64px)]'}`
            }`}
            style={{ width: sidebarWidth, minWidth: 220, maxWidth: 450 }}
            onMouseLeave={onMouseLeave}
        >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                <button onClick={onCreateSession}
                    className="flex-1 bg-[#2A6CF0] hover:bg-[#2259D6] text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.2)] flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden text-ellipsis">
                    ✚ New Chat
                </button>
                <button onClick={onToggleSidebar} className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors shrink-0" title="Toggle Sidebar">
                    {showSidebar ? (
                        <svg className="w-5 h-5 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M9 3v18" /><path d="M15 15l-3-3 3-3" /></svg>
                    ) : (
                        <svg className="w-5 h-5 mx-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M9 3v18" /><path d="M14 9l3 3-3 3" /></svg>
                    )}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-200/50 hover:scrollbar-thumb-gray-300 transition-colors" data-lenis-prevent="true">
                {sessions.map(s => (
                    <div key={s.SessionId}
                        onClick={() => onLoadSession(s.SessionId)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-all ${activeSessionId === s.SessionId
                            ? 'bg-[#2A6CF0]/10 text-[#2A6CF0] font-medium'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}>
                        <div className="flex items-center gap-2 truncate flex-1">
                            <MessageSquare size={14} className="text-current opacity-70 shrink-0" />
                            <span className="truncate">{s.Title}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onDeleteSession(s.SessionId); }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#E45454] text-xs ml-2 transition">✕</button>
                    </div>
                ))}
                {sessions.length === 0 && (
                    <div className="text-center p-6"><div className="flex justify-center mb-3 text-gray-300"><ClipboardList size={36} strokeWidth={1.5} /></div><p className="text-gray-400 text-xs">No conversations yet.<br />Start by asking a question!</p></div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2A6CF0]/10 rounded-full flex items-center justify-center text-sm font-medium text-[#2A6CF0] shrink-0">
                    {user?.firstName?.[0] || <User size={16} />}
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
