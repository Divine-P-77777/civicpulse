'use client';

import React, { useEffect, useState } from 'react';

interface LiveModeProps {
    onClose: () => void;
    onUploadClick: () => void;
}

export default function LiveMode({ onClose, onUploadClick }: LiveModeProps) {
    const [status, setStatus] = useState<'listening' | 'speaking' | 'processing'>('listening');

    // Simulated state changes for visual effect in this initial version
    useEffect(() => {
        const interval = setInterval(() => {
            setStatus(prev => prev === 'listening' ? 'processing' : prev === 'processing' ? 'speaking' : 'listening');
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full min-h-screen flex flex-col items-center justify-between animate-fade-in">
            {/* Header / Info */}
            <div className="pt-20 px-8 w-full max-w-lg text-center z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-3xl flex items-center justify-center shadow-lg mx-auto mb-6 transform hover:scale-105 transition-transform">
                    <span className="text-white text-3xl">⚖️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">CivicPulse Live</h2>
                <p className="text-sm font-medium text-gray-400 uppercase tracking-widest animate-pulse">
                    {status === 'listening' ? 'Listening...' : status === 'processing' ? 'Thinking...' : 'Speaking...'}
                </p>
                <div className="mt-8 text-xl text-gray-600 font-light leading-relaxed px-4 opacity-80 h-32 flex items-center justify-center">
                    {/* Placeholder for real-time transcript */}
                    {status === 'listening' ? 'Tell me about your legal issue...' : 'Analyzing local laws and regulations...'}
                </div>
            </div>

            {/* Glowing Bot Animation Area */}
            <div className="relative w-full h-80 flex items-end justify-center pb-20 z-0">
                {/* 
                    "Gemini Live" style fluid glow effect: 
                    We use absolute positioned blurred blobs that animate.
                    Light theme: Soft blues and greens from the CivicPulse palette.
                */}
                <div className="absolute bottom-0 w-full h-96 flex items-center justify-center overflow-hidden mix-blend-multiply opacity-60">
                    <div className={`absolute w-[40vw] max-w-sm h-48 bg-[#2A6CF0] rounded-full blur-[80px] opacity-70 transition-all duration-1000 origin-center ${status === 'listening' ? 'scale-110 translate-y-4 animate-float' : status === 'speaking' ? 'scale-125 translate-y-0 animate-pulse' : 'scale-90 translate-y-10'
                        }`} style={{ animationDuration: '4s' }} />
                    <div className={`absolute w-[30vw] max-w-xs h-40 bg-[#4CB782] rounded-full blur-[70px] opacity-60 transition-all duration-1000 translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float-delayed' : status === 'speaking' ? 'scale-110 -translate-y-4 animate-pulse' : 'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '3s' }} />
                    <div className={`absolute w-[35vw] max-w-xs h-44 bg-purple-400 rounded-full blur-[80px] opacity-40 transition-all duration-1000 -translate-x-32 origin-center ${status === 'listening' ? 'scale-100 translate-y-8 animate-float' : status === 'speaking' ? 'scale-120 -translate-y-2 animate-pulse' : 'scale-80 translate-y-12'
                        }`} style={{ animationDuration: '5s' }} />
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 w-full flex items-center justify-center gap-6 z-10 px-6">
                <button
                    onClick={onUploadClick}
                    className="w-14 h-14 bg-white border border-gray-200 shadow-lg rounded-full flex items-center justify-center text-gray-500 hover:text-[#2A6CF0] hover:scale-110 active:scale-95 transition-all"
                    title="Upload Document"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                </button>

                <button
                    onClick={onClose}
                    className="w-20 h-20 bg-[#E45454] shadow-[0_8px_32px_rgba(228,84,84,0.4)] rounded-full flex items-center justify-center text-white hover:bg-red-600 hover:scale-105 active:scale-95 transition-all"
                    title="End Live Mode"
                >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.59 13.41c.41.39.41 1.03 0 1.41-.39.39-1.03.39-1.41 0-1.56-1.56-1.56-4.09 0-5.66.39-.39 1.03-.39 1.41 0 .39.39.39 1.03 0 1.41-.78.78-.78 2.05 0 2.83z" />
                        <path d="M13.41 13.41c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0 1.56-1.56 1.56-4.09 0-5.66-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41.78.78.78 2.05 0 2.83z" />
                        <path d="M6.34 17.66c.39.41.39 1.04 0 1.42-.39.39-1.03.39-1.42 0-3.9-3.9-3.9-10.24 0-14.14.39-.39 1.03-.39 1.42 0 .39.39.39 1.02 0 1.41-3.12 3.12-3.12 8.19 0 11.31z" />
                        <path d="M17.66 17.66c-.39.41-.39 1.04 0 1.42.39.39 1.03.39 1.42 0 3.9-3.9 3.9-10.24 0-14.14-.39-.39-1.03-.39-1.42 0-.39.39-.39 1.02 0 1.41 3.12 3.12 3.12 8.19 0 11.31z" />
                    </svg>
                </button>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) scale(1.1); }
                    50% { transform: translateY(-20px) scale(1.05); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(15px) scale(1.1); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 7s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.98); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
