'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { AlertCircle } from 'lucide-react';

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
    const [useProfile, setUseProfile] = useState<boolean>(useProfileFromURL || true);
    const [copied, setCopied] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [currentDraftId, setCurrentDraftId] = useState<string | undefined>();

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
        <div className="h-screen flex flex-row overflow-hidden" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
            <DraftSidebar 
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onSelectDraft={handleSelectDraft}
                onNewDraft={handleStartOver}
                currentDraftId={currentDraftId}
                authFetch={authFetch}
            />

            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarOpen ? 'pl-0 lg:pl-0' : 'pl-0 lg:pl-20'}`}>
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
