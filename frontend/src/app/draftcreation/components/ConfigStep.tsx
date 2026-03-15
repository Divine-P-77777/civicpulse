import React from 'react';
import { PenTool, Sparkles } from 'lucide-react';
import { DraftTypeSelector } from './DraftTypeSelector';

interface ConfigStepProps {
    topic: string;
    draftType: string;
    additionalContext: string;
    onTopicChange: (val: string) => void;
    onDraftTypeChange: (type: string) => void;
    onAdditionalContextChange: (val: string) => void;
    onGenerate: () => void;
}

export function ConfigStep({
    topic,
    draftType,
    additionalContext,
    onTopicChange,
    onDraftTypeChange,
    onAdditionalContextChange,
    onGenerate
}: ConfigStepProps) {
    return (
        <div className="space-y-5">
            <div className="text-center pb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-[#2A6CF0] to-[#4CB782] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_14px_rgba(42,108,240,0.3)]">
                    <PenTool className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create a Legal Draft</h2>
                <p className="text-slate-500 text-sm mt-2">AI-generated documents for complaints, legal notices, and more</p>
            </div>

            <div className="bg-white rounded-3xl shadow-[0_4px_24px_rgba(42,108,240,0.08)] border border-white p-6 space-y-5">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">What do you need to draft?</label>
                    <textarea
                        value={topic}
                        onChange={e => onTopicChange(e.target.value)}
                        rows={4}
                        placeholder="E.g., I need to file a complaint about my landlord not returning my security deposit of ₹50,000 after 3 months…"
                        className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#2A6CF0] focus:ring-2 focus:ring-[#2A6CF0]/10 resize-none transition-all"
                    />
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
                        placeholder="Parties involved, specific dates, clauses, desired outcome…"
                        className="mt-2 w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-[#2A6CF0] focus:ring-2 focus:ring-[#2A6CF0]/10 resize-none transition-all"
                    />
                </div>

                <button
                    onClick={onGenerate}
                    disabled={!topic.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-[#2A6CF0] to-[#4A8CF8] text-white font-bold text-base rounded-2xl shadow-[0_4px_14px_rgba(42,108,240,0.35)] hover:shadow-[0_6px_20px_rgba(42,108,240,0.45)] hover:scale-[1.01] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <Sparkles className="w-5 h-5" />
                    Generate Draft
                </button>
            </div>

            <p className="text-center text-[11px] text-slate-400">
                CivicPulse is an AI assistant, not a lawyer. Always consult a qualified advocate for legal matters.
            </p>
        </div>
    );
}
