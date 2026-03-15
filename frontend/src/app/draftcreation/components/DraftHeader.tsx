import React from 'react';
import { ArrowLeft, PenTool, History } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DraftHeaderProps {
    step: 'confirm' | 'form' | 'generating' | 'done';
    onToggleSidebar?: () => void;
}

export function DraftHeader({ step, onToggleSidebar }: DraftHeaderProps) {
    const router = useRouter();

    const getStatusInfo = () => {
        switch (step) {
            case 'confirm': return { color: 'bg-[#2A6CF0]', label: 'Review Context' };
            case 'form': return { color: 'bg-[#2A6CF0]', label: 'Configure' };
            case 'generating': return { color: 'bg-amber-400 animate-pulse', label: 'Generating…' };
            case 'done': return { color: 'bg-emerald-400', label: 'Done' };
        }
    };

    const status = getStatusInfo();

    return (
        <div className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-100 px-4 py-3 flex items-center gap-3">
            <button
                onClick={() => router.back()}
                className="p-2 rounded-xl text-slate-500 hover:text-[#2A6CF0] hover:bg-indigo-50 transition-all"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-xl flex items-center justify-center shadow-sm">
                    <PenTool className="w-4 h-4 text-white" />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-slate-900 leading-none">Draft Creator</h1>
                    <p className="text-[10px] text-slate-400 mt-0.5">AI-powered legal documents</p>
                </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
                {onToggleSidebar && (
                    <button 
                        onClick={onToggleSidebar}
                        className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-500 rounded-lg border border-slate-100 font-bold text-[10px] hover:bg-slate-100"
                    >
                        <History size={12} className="text-[#2A6CF0]" />
                        History
                    </button>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                    {status.label}
                </div>
            </div>
        </div>
    );
}
