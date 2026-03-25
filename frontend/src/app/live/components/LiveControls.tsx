import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';

interface LiveControlsProps {
    cameraMode: 'off' | 'viewfinder' | 'review';
    status: string;
    language: 'en' | 'hi';
    fileInputRef: RefObject<HTMLInputElement>;
    startCamera: () => void;
    capturePhoto: () => void;
    handleSilenceToggle: () => void;
    onClose: () => void;
}

export const LiveControls: React.FC<LiveControlsProps> = ({
    cameraMode,
    status,
    language,
    fileInputRef,
    startCamera,
    capturePhoto,
    handleSilenceToggle,
    onClose
}) => {

    const getMainButtonStyle = () => {
        if (status === 'listening') return 'bg-rose-500 shadow-[0_12px_40px_rgba(244,63,94,0.45)] scale-110';
        if (status === 'processing') return 'bg-amber-500 shadow-[0_12px_40px_rgba(245,158,11,0.35)]';
        if (status === 'speaking') return 'bg-emerald-500 shadow-[0_12px_40px_rgba(16,185,129,0.35)]';
        return 'bg-blue-600 shadow-[0_12px_40px_rgba(37,99,235,0.35)]';
    };

    return (
        <div className="relative w-full flex flex-col items-center gap-4 z-50 pb-8 sm:pb-12 text-blue-100">
            {cameraMode === 'viewfinder' ? (
                <div className="flex items-center justify-center w-full pb-4">
                    <button onClick={capturePhoto} className="group relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 bg-white/20 rounded-full scale-125 blur-sm" />
                        <div className="absolute inset-0 border-4 border-white rounded-full group-active:scale-90 transition-transform" />
                        <div className="w-12 h-12 bg-white rounded-full transition-all" />
                    </button>
                </div>
            ) : cameraMode === 'off' ? (
                <div className="p-2 sm:p-3 bg-white/40 backdrop-blur-2xl rounded-[40px] border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] flex items-center gap-3 sm:gap-6 mx-6 transition-all hover:bg-white/50">
                    {/* Upload button */}
                    <button id="tour-upload" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all active:scale-90">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </button>

                    {/* Camera button */}
                    <button id="tour-camera" onClick={startCamera} className="w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-emerald-600 transition-all active:scale-90">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                    </button>

                    {/* Main action button: Nested in a portal-like glow */}
                    <div className="relative group">
                        <motion.div 
                            animate={status === 'listening' ? { scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] } : { scale: 1, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-blue-500 rounded-full blur-xl"
                        />
                        <button id="tour-main" onClick={handleSilenceToggle} className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${getMainButtonStyle()} text-white active:scale-90 z-10 hover:brightness-110`}>
                            {status === 'listening' ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            ) : status === 'processing' ? (
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-75" />
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce delay-150" />
                                </div>
                            ) : status === 'speaking' ? (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="6" width="12" height="12" rx="2" ry="2" /></svg>
                            ) : (
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                            )}
                        </button>
                    </div>

                    {/* Close button */}
                    <button onClick={onClose} className="w-12 h-12 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-slate-500 hover:text-rose-600 transition-all active:scale-90">
                        <FiX size={24} className="stroke-[2.5]" />
                    </button>
                </div>
            ) : null}

            {/* Professional UI Disclaimer */}
            {cameraMode === 'off' && (
                <p className="text-[10px] text-slate-400 mt-2 text-center px-8 min-h-[16px] leading-[1.2] font-bold opacity-40 uppercase tracking-tighter">
                    {language === 'hi' ? 'AI पर आधारित। कानूनी मामलों के लिए पेशेवर वकील से परामर्श लें।' : 'CivicPulse is an AI assistant, not a lawyer. For serious matters, always consult a qualified lawyer.'}
                </p>
            )}
        </div>
    );
};
