'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { AlertCircle, Sparkles, X } from 'lucide-react';

// Components
import { DraftHeader } from './components/DraftHeader';
import { ConfirmStep } from './components/ConfirmStep';
import { ConfigStep } from './components/ConfigStep';
import { GeneratingStep } from './components/GeneratingStep';
import { DoneStep } from './components/DoneStep';
import DraftSidebar from './components/DraftSidebar';

// Hooks & Utils
import { useDraftGeneration } from './hooks/useDraftGeneration';
import { exportToPDF } from './utils/pdfUtils';
import { DRAFT_TYPES } from './constants';
import { useCallback } from 'react';

interface UserProfile {
    full_name: string;
    address: string;
    contact_number: string;
    email: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function DraftCreationPageInner() {
    const searchParams = useSearchParams();
    const { isLoaded } = useAuth();

    const topicFromURL = searchParams.get('topic') || '';
    const sourceFromURL = searchParams.get('source') || 'direct';
    const contextFromURL = searchParams.get('initialContext') || '';
    const typeFromURL = searchParams.get('type') || '';
    const useProfileFromURL = searchParams.get('useProfile') === 'true';

    const [step, setStep] = useState<'confirm' | 'form' | 'generating' | 'done'>(
        contextFromURL ? 'generating' : (topicFromURL ? 'confirm' : 'form')
    );
    const [topic, setTopic] = useState(topicFromURL);
    const [draftType, setDraftType] = useState<string>(typeFromURL || 'complaint');
    const [additionalContext, setAdditionalContext] = useState(contextFromURL);
    const [language, setLanguage] = useState('en');
    const [generatedContent, setGeneratedContent] = useState('');
    const [editableContent, setEditableContent] = useState('');
    const [useProfile, setUseProfile] = useState<boolean>(useProfileFromURL || false);
    const [copied, setCopied] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();
    
    // Profile states
    const [profile, setProfile] = useState<UserProfile>({
        full_name: '',
        address: '',
        contact_number: '',
        email: ''
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const { getToken } = useAuth();

    // ─── Responsive Sidebar Initialization ───
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        handleResize(); // Run once on mount
        // We don't necessarily want to listen for every resize, just initial state
    }, []);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        return fetch(url, {
            ...options,
            headers: { ...(options.headers as Record<string, string>), 'Authorization': `Bearer ${token}` },
        });
    }, [getToken]);

    const fetchProfile = async () => {
        try {
            const res = await authFetch(`${API_BASE}/api/user/profile`);
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    const newProfile = {
                        full_name: data.profile.full_name || '',
                        address: data.profile.address || '',
                        contact_number: data.profile.contact_number || '',
                        email: data.profile.email || ''
                    };
                    setProfile(newProfile);
                    
                    const hasData = Object.values(newProfile).some(val => val.trim().length > 0);
                    if (hasData && searchParams.get('useProfile') !== 'false') {
                        setUseProfile(true);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch profile:", err);
        }
    };

    const saveProfile = async () => {
        setSavingProfile(true);
        try {
            const res = await authFetch(`${API_BASE}/api/user/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
            if (res.ok) {
                alert("Profile saved! Your future drafts will be personalized.");
                setShowProfile(false);
            }
        } catch (err) {
            alert("Failed to save profile");
        } finally {
            setSavingProfile(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            fetchProfile();
        }
    }, [isLoaded]);

    const { isGenerating, streamingContent, error, generateDraft, resetError } = useDraftGeneration({
        topic,
        draftType,
        additionalContext,
        language,
        useProfile,
        onSuccess: (content) => {
            setGeneratedContent(content);
            setEditableContent(content);
            setStep('done');
        }
    });

    // Auto-generate if coming from Chat with context
    useEffect(() => {
        if (contextFromURL && !generatedContent && !isGenerating && !error && isLoaded) {
            generateDraft();
        }
    }, [contextFromURL, isLoaded]);

    // Infer draft type from topic URL if not explicitly provided
    useEffect(() => {
        if (!topicFromURL || typeFromURL) return;
        const t = topicFromURL.toLowerCase();
        if (t.includes('complaint')) setDraftType('complaint');
        else if (t.includes('notice')) setDraftType('legal_notice');
        else if (t.includes('appeal')) setDraftType('appeal');
        else if (t.includes('affidavit')) setDraftType('affidavit');
        else if (t.includes('rti')) setDraftType('rti');
    }, [topicFromURL, typeFromURL]);

    // Handle transition to generating
    useEffect(() => {
        if (isGenerating && step !== 'generating') {
            setStep('generating');
        }
    }, [isGenerating, step]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(editableContent || generatedContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        try {
            await exportToPDF(editableContent || generatedContent, topic, draftType, language);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleStartOver = () => {
        resetError();
        setStep('form');
        setGeneratedContent('');
        setCurrentDraftId(undefined);
    };

    const handleSelectDraft = (draft: any) => {
        setTopic(draft.Topic);
        setDraftType(draft.Type);
        setGeneratedContent(draft.Content);
        setCurrentDraftId(draft.DraftId);
        setStep('done');
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="w-10 h-10 border-4 border-[#2A6CF0] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="h-screen flex flex-row overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <DraftSidebar 
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                    onSelectDraft={handleSelectDraft}
                    onNewDraft={handleStartOver}
                    currentDraftId={currentDraftId}
                    authFetch={authFetch}
                />

                <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'pl-0 md:pl-[280px]' : 'pl-0 md:pl-20'}`}>
                    <DraftHeader 
                        step={step} 
                        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                    />

                    <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent="true">
                        <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
                        {/* Global Error Banner */}
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-rose-800">Generation Error</p>
                                    <p className="text-xs text-rose-600">{error}</p>
                                </div>
                                <button 
                                    onClick={handleStartOver}
                                    className="px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {step === 'confirm' && !error && (
                            <ConfirmStep
                                topic={topic}
                                source={sourceFromURL}
                                draftType={draftType}
                                additionalContext={additionalContext}
                                onEditTopic={() => setStep('form')}
                                onDraftTypeChange={setDraftType}
                                onAdditionalContextChange={setAdditionalContext}
                                onGenerate={generateDraft}
                            />
                        )}

                        {step === 'form' && !error && (
                            <ConfigStep
                                topic={topic}
                                draftType={draftType}
                                additionalContext={additionalContext}
                                onTopicChange={setTopic}
                                onDraftTypeChange={setDraftType}
                                onAdditionalContextChange={setAdditionalContext}
                                onGenerate={generateDraft}
                                language={language}
                                onLanguageChange={setLanguage}
                                useProfile={useProfile}
                                onUseProfileChange={setUseProfile}
                                profile={profile}
                                setProfile={setProfile}
                                showProfile={showProfile}
                                setShowProfile={setShowProfile}
                                savingProfile={savingProfile}
                                saveProfile={saveProfile}
                            />
                        )}

                        {step === 'generating' && !error && (
                            <GeneratingStep
                                streamingContent={streamingContent}
                                draftType={draftType}
                            />
                        )}

                        {step === 'done' && !error && (
                            <DoneStep
                                generatedContent={generatedContent}
                                editableContent={editableContent}
                                onContentChange={setEditableContent}
                                draftType={draftType}
                                onCopy={handleCopy}
                                onExportPDF={handleExportPDF}
                                onStartOver={handleStartOver}
                                isExportingPDF={isExportingPDF}
                                copied={copied}
                            />
                        )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Edit Overlay Modal - Moved to root for full backdrop blur coverage */}
            {showProfile && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <Sparkles size={16} />
                                <span className="text-sm font-bold">Personalized Data</span>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowProfile(false);
                                    setUseProfile(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-2xl transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-3.5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="John Doe" 
                                        value={profile.full_name}
                                        onChange={e => setProfile({...profile, full_name: e.target.value})}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Address</label>
                                    <textarea 
                                        placeholder="Flat 101, Galaxy Apts..." 
                                        value={profile.address}
                                        onChange={e => setProfile({...profile, address: e.target.value})}
                                        rows={2}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contact</label>
                                        <input 
                                            type="text" 
                                            placeholder="+91..." 
                                            value={profile.contact_number}
                                            onChange={e => setProfile({...profile, contact_number: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Email</label>
                                        <input 
                                            type="email" 
                                            placeholder="john@example.com" 
                                            value={profile.email}
                                            onChange={e => setProfile({...profile, email: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={saveProfile}
                                disabled={savingProfile}
                                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                            >
                                {savingProfile ? "Saving..." : "Save Details"}
                            </button>
                            <p className="text-[10px] text-slate-400 text-center italic mt-1 leading-relaxed">
                                Used to auto-fill your details in generated drafts.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default function DraftCreationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="w-10 h-10 border-4 border-[#2A6CF0] border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <DraftCreationPageInner />
        </Suspense>
    );
}
