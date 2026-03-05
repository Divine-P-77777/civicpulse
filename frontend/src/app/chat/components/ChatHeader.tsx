'use client';

import React from 'react';
import Link from 'next/link';

interface ChatHeaderProps {
    showSidebar: boolean;
    onToggleSidebar: () => void;
    hasActiveSession: boolean;
    onShareClick: () => void;
}

export default function ChatHeader({ showSidebar, onToggleSidebar, hasActiveSession, onShareClick }: ChatHeaderProps) {
    return (
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 md:gap-3">
                <Link href="/" className="p-2 text-gray-400 hover:text-gray-700 transition hover:bg-gray-100 rounded-xl" title="Back to Home">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19L5 12L12 5" /></svg>
                </Link>
                <button onClick={onToggleSidebar} className="p-2 text-gray-400 hover:text-gray-700 transition hover:bg-gray-100 rounded-xl md:block hidden" title="Toggle sidebar">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12H21" /><path d="M3 6H21" /><path d="M3 18H21" /></svg>
                </button>
                <div className="w-9 h-9 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-white text-base">⚖️</span>
                </div>
                <div>
                    <h1 className="text-gray-900 font-semibold text-sm md:text-base">CivicPulse AI</h1>
                    <p className="text-gray-400 text-xs hidden md:block">Your Legal Rights Advisor</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {hasActiveSession && (
                    <button onClick={onShareClick}
                        className="p-2 text-gray-400 hover:text-[#2A6CF0] transition hover:bg-[#2A6CF0]/5 rounded-xl" title="Share conversation">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                    </button>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#4CB782]/10 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#4CB782] rounded-full animate-pulse"></span>
                    <span className="text-xs text-[#4CB782] font-medium">Online</span>
                </div>
            </div>
        </header>
    );
}


// One critical new pipeline we should include like if from the frontend user select hindi or english language usecontext then from backend response also should as hindi or english and same elevanlabs also gonna stream as same , basically we able to preference send via request object , 