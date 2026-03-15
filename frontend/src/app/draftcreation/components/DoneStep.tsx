import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, Download, Loader2, FileText, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DRAFT_TYPES } from '../constants';

interface DoneStepProps {
    generatedContent: string;
    draftType: string;
    onCopy: () => void;
    onExportPDF: () => void;
    onStartOver: () => void;
    isExportingPDF: boolean;
    copied: boolean;
}

export function DoneStep({
    generatedContent,
    draftType,
    onCopy,
    onExportPDF,
    onStartOver,
    isExportingPDF,
    copied
}: DoneStepProps) {
    const selectedType = DRAFT_TYPES.find(t => t.id === draftType);

    return (
        <div className="space-y-4">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="font-bold text-emerald-800 text-sm">Draft Generated</p>
                        <p className="text-xs text-emerald-600">{selectedType?.label} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={onCopy} className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-all">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={onExportPDF}
                        disabled={isExportingPDF}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2A6CF0] text-white text-xs font-bold rounded-xl hover:bg-[#2259D6] transition-all disabled:opacity-70 shadow-[0_2px_8px_rgba(42,108,240,0.3)]"
                    >
                        {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {isExportingPDF ? 'Exporting…' : 'Save PDF'}
                    </button>
                </div>
            </div>

            {/* Document viewer */}
            <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(42,108,240,0.08)] border border-white overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">Document Preview</span>
                    </div>
                    <button
                        onClick={onStartOver}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#2A6CF0] font-medium transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Start Over
                    </button>
                </div>

                <div className="p-6 h-[60vh] overflow-y-auto overscroll-contain custom-scrollbar">
                    <div className="prose prose-slate prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {generatedContent}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>

            <p className="text-center text-[11px] text-slate-400">
                Review this document carefully. CivicPulse is an AI. Always verify with a qualified advocate before submitting.
            </p>
        </div>
    );
}
