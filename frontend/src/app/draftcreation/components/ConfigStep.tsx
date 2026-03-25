import React from 'react';
import { PenTool, Sparkles, X, Edit2 } from 'lucide-react';
import { DraftTypeSelector } from './DraftTypeSelector';

interface UserProfile {
    full_name: string;
    address: string;
    contact_number: string;
    email: string;
}

interface ConfigStepProps {
    topic: string;
    draftType: string;
    additionalContext: string;
    onTopicChange: (val: string) => void;
    onDraftTypeChange: (type: string) => void;
    onAdditionalContextChange: (val: string) => void;
    language: string;
    onLanguageChange: (lang: string) => void;
    useProfile: boolean;
    onUseProfileChange: (val: boolean) => void;
    onGenerate: () => void;
    profile: UserProfile;
    setProfile: (profile: UserProfile) => void;
    showProfile: boolean;
    setShowProfile: (show: boolean) => void;
    savingProfile: boolean;
    saveProfile: () => void;
}

export function ConfigStep({
    topic,
    draftType,
    additionalContext,
    onTopicChange,
    onDraftTypeChange,
    onAdditionalContextChange,
    language,
    onLanguageChange,
    useProfile,
    onUseProfileChange,
    onGenerate,
    profile,
    setProfile,
    showProfile,
    setShowProfile,
    savingProfile,
    saveProfile
}: ConfigStepProps) {
    const languages = [
        { id: 'en', label: 'English' },
        { id: 'hi', label: 'Hindi' },
        { id: 'bn', label: 'Bengali' },
        { id: 'ta', label: 'Tamil' },
        { id: 'te', label: 'Telugu' },
    ];
    return (
        <div className="space-y-5 relative">
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

                {/* Personalization Section moved directly below Document Type */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col group hover:bg-slate-100 transition-all">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${useProfile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Use My Personalized Data</p>
                                <p className="text-[10px] text-slate-500">Auto-fill my name, address, and contact info</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                const nextState = !useProfile;
                                onUseProfileChange(nextState);
                                if (nextState) {
                                    setShowProfile(true);
                                }
                            }}
                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${useProfile ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${useProfile ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    {useProfile && (
                        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setShowProfile(true)}
                                className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                <Edit2 size={12} /> Edit My Details
                            </button>
                        </div>
                    )}
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

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Output Language</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {languages.map(lang => (
                            <button
                                key={lang.id}
                                onClick={() => onLanguageChange(lang.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                    language === lang.id 
                                    ? 'bg-[#2A6CF0] text-white border-[#2A6CF0] shadow-md shadow-[#2A6CF0]/20' 
                                    : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-300'
                                }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
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
