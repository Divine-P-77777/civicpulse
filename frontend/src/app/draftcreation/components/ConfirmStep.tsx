import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { DraftTypeSelector } from './DraftTypeSelector';

interface ConfirmStepProps {
    topic: string;
    source: string;
    draftType: string;
    additionalContext: string;
    onEditTopic: () => void;
    onDraftTypeChange: (type: string) => void;
    onAdditionalContextChange: (val: string) => void;
    onGenerate: () => void;
}

export function ConfirmStep({
    topic,
    source,
    draftType,
    additionalContext,
    onEditTopic,
    onDraftTypeChange,
    onAdditionalContextChange,
    onGenerate
}: ConfirmStepProps) {
    return (
        <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(42,108,240,0.08)] border border-white overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-gradient-to-r from-indigo-50/60 to-blue-50/40">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">
                            Detected from {source === 'live' ? 'Live Mode' : 'Chat'}
                        </p>
                        <h2 className="text-lg font-bold text-slate-900">We understood your request</h2>
                        <p className="text-sm text-slate-500 mt-1">Review and confirm the details before generating</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Request</label>
                    <div className="mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-slate-800 text-sm leading-relaxed">"{topic}"</p>
                    </div>
                    <button
                        onClick={onEditTopic}
                        className="mt-2 text-xs text-[#2A6CF0] hover:underline font-medium"
                    >
                        Edit this →
                    </button>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                    <DraftTypeSelector selectedType={draftType} onSelect={onDraftTypeChange} />
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Details <span className="normal-case text-slate-400 font-normal">(optional)</span></label>
                    <textarea
                        value={additionalContext}
                        onChange={e => onAdditionalContextChange(e.target.value)}
                        rows={3}
                        placeholder="Parties involved, dates, specific clauses, desired outcome…"
                        className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#2A6CF0] focus:ring-2 focus:ring-[#2A6CF0]/10 resize-none transition-all"
                    />
                </div>

                <button
                    onClick={onGenerate}
                    className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#2A6CF0] to-[#4A8CF8] text-white font-bold text-base rounded-2xl shadow-[0_4px_14px_rgba(42,108,240,0.35)] hover:shadow-[0_6px_20px_rgba(42,108,240,0.45)] hover:scale-[1.01] transition-all"
                >
                    <CheckCircle2 className="w-5 h-5" />
                    Confirm & Generate Draft
                </button>
            </div>
        </div>
    );
}
