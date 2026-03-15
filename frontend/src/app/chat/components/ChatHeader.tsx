'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface ChatHeaderProps {
    showSidebar: boolean;
    onToggleSidebar: () => void;
    hasActiveSession: boolean;
    onShareClick: () => void;
    onHistoryClick: () => void;
    language: 'en' | 'hi';
    onLanguageChange: (lang: 'en' | 'hi') => void;
    title?: string;
}

export default function ChatHeader({ showSidebar, onToggleSidebar, hasActiveSession, onShareClick, onHistoryClick, language, onLanguageChange, title }: ChatHeaderProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/60 px-3 md:px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1.5 md:gap-3">
                <Link href="/" className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 transition hover:bg-gray-100 rounded-xl" title="Back to Home">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19L5 12L12 5" /></svg>
                </Link>
                <button onClick={onToggleSidebar} className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 transition hover:bg-gray-100 rounded-xl md:block hidden" title="Toggle sidebar">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12H21" /><path d="M3 6H21" /><path d="M3 18H21" /></svg>
                </button>
                <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-xl flex items-center justify-center shadow-sm shrink-0">
                    <span className="text-white text-sm md:text-base">⚖️</span>
                </div>
                <div>
                    <h1 className="text-gray-900 font-semibold text-sm md:text-base line-clamp-1">{title || "CivicPulse AI"}</h1>
                    <p className="text-gray-400 text-xs hidden md:block">Your Legal Rights Advisor</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-[#4CB782]/10 rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#4CB782] rounded-full animate-pulse"></span>
                    <span className="text-xs text-[#4CB782] font-medium hidden sm:block">Online</span>
                </div>

                {/* Dropdown Menu */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                        </svg>
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-2 z-50">
                            {/* Mobile History Option */}
                            <div className="md:hidden px-2 mb-1 border-b border-gray-100 pb-1">
                                <button
                                    onClick={() => { onHistoryClick(); setDropdownOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl flex items-center gap-2 transition"
                                >
                                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    History
                                </button>
                            </div>

                            {/* Language Options */}
                            <div className="px-3 py-2 border-b border-gray-100 mb-1">
                                <p className="text-xs text-gray-400 font-medium mb-2 px-1">Language</p>
                                <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                                    <button onClick={() => { onLanguageChange('en'); setDropdownOpen(false); }}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'en' ? 'bg-white text-[#2A6CF0] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}>EN</button>
                                    <button onClick={() => { onLanguageChange('hi'); setDropdownOpen(false); }}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${language === 'hi' ? 'bg-white text-[#2A6CF0] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}>हि</button>
                                </div>
                            </div>

                            {/* Share Option */}
                            {hasActiveSession ? (
                                <button
                                    onClick={() => { onShareClick(); setDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
                                >
                                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                    Share Chat
                                </button>
                            ) : (
                                <div className="px-4 py-2 text-sm text-gray-400 flex items-center gap-2 cursor-not-allowed" title="Start a chat to share">
                                    <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
                                    </svg>
                                    Share Chat
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}