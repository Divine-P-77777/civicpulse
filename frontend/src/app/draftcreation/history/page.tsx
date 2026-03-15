'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, SignInButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { 
    History, 
    FileText, 
    Trash2, 
    Search, 
    ArrowLeft, 
    Calendar, 
    Clock, 
    ExternalLink, 
    AlertCircle,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

interface SavedDraft {
    DraftId: string;
    Topic: string;
    TypeLabel: string;
    Type: string;
    Content: string;
    CreatedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function HistoryPage() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [drafts, setDrafts] = useState<SavedDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        return fetch(url, {
            ...options,
            headers: { 
                ...(options.headers as Record<string, string>), 
                'Authorization': `Bearer ${token}` 
            },
        });
    }, [getToken]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await authFetch(`${API_BASE}/api/drafts/history`);
            if (res.ok) {
                const data = await res.json();
                setDrafts(data.drafts || []);
            } else {
                setError("Failed to load your history. Please try again later.");
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
            setError("Connectivity issue. Please check your internet.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            fetchHistory();
        }
    }, [isLoaded, isSignedIn]);

    const handleDelete = async (draftId: string) => {
        if (!window.confirm("Are you sure you want to permanently delete this draft?")) return;
        
        try {
            const res = await authFetch(`${API_BASE}/api/drafts/${draftId}`, { method: 'DELETE' });
            if (res.ok) {
                setDrafts(prev => prev.filter(d => d.DraftId !== draftId));
            } else {
                alert("Failed to delete draft.");
            }
        } catch (err) {
            alert("Error deleting draft.");
        }
    };

    const filteredDrafts = drafts.filter(d =>
        d.Topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.TypeLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.Type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!isLoaded) return <LoadingState />;

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/draftcreation" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <History size={18} className="text-indigo-600" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-900">Draft History</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/draftcreation" 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-md active:scale-95"
                        >
                            Create New
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <SignedOut>
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Sign in to view your history</h2>
                        <p className="text-slate-500 mb-6">Your legal drafts are securely stored in your account.</p>
                        <SignInButton mode="modal">
                            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                                Sign In Now
                            </button>
                        </SignInButton>
                    </div>
                </SignedOut>

                <SignedIn>
                    {/* Search Bar */}
                    <div className="relative mb-8 max-w-2xl mx-auto sm:mx-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by topic or document type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 bg-red-50 rounded-3xl border border-red-100">
                            <p className="text-red-600 font-medium">{error}</p>
                            <button onClick={fetchHistory} className="mt-4 text-indigo-600 font-bold underline">Try Again</button>
                        </div>
                    ) : filteredDrafts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <FileText className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">No Drafts Found</h3>
                            <p className="text-slate-500 text-sm mt-1">
                                {searchTerm ? "Try a different search term" : "Your generated legal documents will appear here"}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredDrafts.map((draft) => (
                                <DraftCard key={draft.DraftId} draft={draft} onDelete={handleDelete} />
                            ))}
                        </div>
                    )}
                </SignedIn>
            </main>
        </div>
    );
}

function DraftCard({ draft, onDelete }: { draft: SavedDraft; onDelete: (id: string) => void }) {
    const formattedDate = new Date(draft.CreatedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    const formattedTime = new Date(draft.CreatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300 overflow-hidden flex flex-col h-full">
            <div className="p-6 flex-1">
                <div className="flex items-center justify-between mb-4">
                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                        {draft.TypeLabel || draft.Type.replace('_', ' ')}
                    </span>
                    <button 
                        onClick={() => onDelete(draft.DraftId)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Draft"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-3 line-clamp-2 leading-relaxed">
                    {draft.Topic}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-auto">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {formattedDate}
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {formattedTime}
                    </div>
                </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between mt-auto">
                <Link 
                    href={`/draftcreation?topic=${encodeURIComponent(draft.Topic)}`}
                    className="text-indigo-600 text-xs font-bold flex items-center gap-1.5 hover:gap-2.5 transition-all"
                >
                    Open in Editor <ExternalLink size={12} />
                </Link>
                <div className="text-[10px] text-slate-400 font-medium">
                    {draft.Content.length} chars
                </div>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-indigo-600 font-bold animate-pulse">Loading CivicPulse History...</p>
            </div>
        </div>
    );
}
