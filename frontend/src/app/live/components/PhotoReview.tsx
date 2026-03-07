'use client';

import React from 'react';

interface PhotoReviewProps {
    image: string;
    onAccept: () => void;
    onRetry: () => void;
    onCancel: () => void;
}

export default function PhotoReview({ image, onAccept, onRetry, onCancel }: PhotoReviewProps) {
    return (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-fade-in shadow-2xl">
            {/* Captured Image Display */}
            <div className="flex-1 relative flex items-center justify-center p-4">
                <img
                    src={image}
                    alt="Captured preview"
                    className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain border-2 border-white/10 ring-1 ring-white/20"
                />
            </div>

            {/* Action Bar */}
            <div className="h-32 bg-black/90 backdrop-blur-2xl flex items-center justify-around px-8 pb-8 border-t border-white/5">
                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    className="group flex flex-col items-center gap-2"
                    title="Cancel"
                >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-white/10 group-hover:text-white group-active:scale-90 transition-all border border-white/10">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                        </svg>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">Cancel</span>
                </button>

                {/* Retake Button */}
                <button
                    onClick={onRetry}
                    className="group flex flex-col items-center gap-2"
                    title="Retake Photo"
                >
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center text-white/70 group-hover:bg-white/10 group-hover:text-white group-active:scale-90 transition-all border border-white/10">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">Retake</span>
                </button>

                {/* Accept Button */}
                <button
                    onClick={onAccept}
                    className="group flex flex-col items-center gap-2"
                    title="Accept and Process"
                >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4CB782] to-[#3A8C63] flex items-center justify-center text-white shadow-[0_0_40px_rgba(76,183,130,0.3)] group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(76,183,130,0.5)] group-active:scale-95 transition-all outline outline-4 outline-transparent group-hover:outline-white/20">
                        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-[#4CB782]">Accept</span>
                </button>
            </div>

            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(1.05); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
