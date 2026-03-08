'use client';

import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';
import Link from 'next/link';
import { PenTool, ArrowLeft } from 'lucide-react';

export default function DraftCreationPage() {
    const dispatch = useAppDispatch();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 sm:p-14 text-center shadow-[0_8px_40px_rgba(42,108,240,0.08)] border border-white/50 relative overflow-hidden">
                {/* Decorative background blurs inside the card */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-60 -mr-10 -mt-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 -ml-10 -mb-10 pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-indigo-100/50">
                        <PenTool className="w-10 h-10 text-indigo-600" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                        Make a Draft
                    </h1>
                    
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50 mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Soon Available</span>
                    </div>

                    <p className="text-lg text-slate-500 mb-10 leading-relaxed font-medium">
                        Our AI drafting tool is currently in development. You will soon be able to auto-generate legal responses and letters instantly!
                    </p>

                    <Link 
                        href="/" 
                        onClick={() => dispatch(setCurrentMode('home'))}
                        className="group flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-[0_4px_14px_rgba(42,108,240,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(42,108,240,0.4)]"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
