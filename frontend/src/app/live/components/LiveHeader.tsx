import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch } from '@/hooks/redux';
import { setLanguage } from '@/store/slices/uiSlice';

interface LiveHeaderProps {
    language: 'en' | 'hi';
    status: string;
    currentStatus: { label: string; color: string; pulse: boolean };
    cameraMode: 'off' | 'viewfinder' | 'review';
}

export const LiveHeader: React.FC<LiveHeaderProps> = ({ language, status, currentStatus, cameraMode }) => {
    const dispatch = useAppDispatch();

    return (
        <div className={`mt-8 sm:mt-10 px-6 w-full max-w-lg text-center z-20 flex flex-col items-center transition-all duration-700 ${cameraMode !== 'off' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
            <div className="flex justify-center mb-6">
                <div className="bg-white/40 backdrop-blur-xl p-1 rounded-2xl flex gap-1 border border-white/50 shadow-sm">
                    <button onClick={() => dispatch(setLanguage('en'))} className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>EN</button>
                    <button onClick={() => dispatch(setLanguage('hi'))} className={`px-5 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${language === 'hi' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>हि</button>
                </div>
            </div>

            <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                    CivicPulse <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">Live</span>
                </h2>
                
                {/* Status indicator pill with kinetic label */}
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={status}
                        initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -10, filter: 'blur(5px)' }}
                        className="flex items-center justify-center gap-2"
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'listening' ? 'bg-blue-500' : status === 'speaking' ? 'bg-emerald-500' : status === 'processing' ? 'bg-amber-500' : status === 'error' ? 'bg-red-400' : 'bg-slate-300'} ${currentStatus.pulse ? 'animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`} />
                        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">
                            {currentStatus.label.split('').map((char, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.03 }}
                                >
                                    {char}
                                </motion.span>
                            ))}
                        </p>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
