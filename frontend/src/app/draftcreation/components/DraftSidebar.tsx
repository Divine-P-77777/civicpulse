'use client';

import React, { useState, useEffect } from 'react';
import { History, FileText, Trash2, ChevronLeft, ChevronRight, PlusCircle, Search, Sparkles, ExternalLink } from 'lucide-react';

interface SavedDraft {
    DraftId: string;
    Topic: string;
    TypeLabel: string;
    Type: string;
    Content: string;
    CreatedAt: string;
}
import Link from 'next/link';

interface UserProfile {
    full_name: string;
    address: string;
    contact_number: string;
    email: string;
}

interface DraftSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onSelectDraft: (draft: SavedDraft) => void;
    onNewDraft: () => void;
    currentDraftId?: string;
    authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function DraftSidebar({
    isOpen,
    onToggle,
    onSelectDraft,
    onNewDraft,
    currentDraftId,
    authFetch
}: DraftSidebarProps) {
    const [drafts, setDrafts] = useState<SavedDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [profile, setProfile] = useState<UserProfile>({
        full_name: '',
        address: '',
        contact_number: '',
        email: ''
    });
    const [savingProfile, setSavingProfile] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/api/drafts/history`);
            if (res.ok) {
                const data = await res.json();
                setDrafts(data.drafts || []);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await authFetch(`${API_BASE}/api/user/profile`);
            if (res.ok) {
                const data = await res.json();
                if (data.profile) {
                    setProfile({
                        full_name: data.profile.full_name || '',
                        address: data.profile.address || '',
                        contact_number: data.profile.contact_number || '',
                        email: data.profile.email || ''
                    });
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
        fetchHistory();
        fetchProfile();
    }, []);

    const handleDelete = async (e: React.MouseEvent, draftId: string) => {
        e.stopPropagation();
        if (!window.confirm("Delete this draft permanently?")) return;
        try {
            const res = await authFetch(`${API_BASE}/api/drafts/${draftId}`, { method: 'DELETE' });
            if (res.ok) {
                setDrafts(prev => prev.filter(d => d.DraftId !== draftId));
            }
        } catch (err) {
            alert("Failed to delete draft");
        }
    };

    const filteredDrafts = drafts.filter(d =>
        d.Topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.TypeLabel.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            {/* Mobile Backdrop Overlay - Only shows when sidebar is open on mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] md:hidden animate-in fade-in duration-300"
                    onClick={onToggle}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none ${isOpen ? 'w-full max-w-[280px] translate-x-0' : 'w-80 -translate-x-full md:w-20 md:translate-x-0'
                    }`}
            >
                {/* Header */}
                <div className={`p-4 flex items-center justify-between border-b border-gray-100 ${!isOpen && 'md:justify-center'}`}>
                    {isOpen ? (
                        <>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="w-8 h-8 bg-[#2A6CF0]/10 rounded-lg flex items-center justify-center shrink-0">
                                    <History size={18} className="text-[#2A6CF0]" />
                                </div>
                                <span className="font-bold text-gray-900 truncate text-sm">Draft History</span>
                            </div>
                            <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                                <ChevronLeft size={20} />
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <button onClick={onToggle} className="p-2.5 hover:bg-gray-100 rounded-xl text-[#2A6CF0] transition-all">
                                <ChevronRight size={24} />
                            </button>
                            <button 
                                onClick={() => { onToggle(); setShowProfile(true); }}
                                className="p-2.5 hover:bg-gray-100 rounded-xl text-[#4CB782] transition-all"
                                title="Personalization"
                            >
                                <Sparkles size={24} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={`p-4 ${!isOpen && 'md:flex md:flex-col md:items-center'}`}>
                    {isOpen ? (
                        <button
                            onClick={() => { onNewDraft(); if (window.innerWidth < 768) onToggle(); }}
                            className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-md active:scale-95"
                        >
                            <PlusCircle size={18} /> New Document
                        </button>
                    ) : (
                        <button onClick={onNewDraft} className="w-12 h-12 bg-[#2A6CF0] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95">
                            <PlusCircle size={24} />
                        </button>
                    )}

                    {isOpen && (
                        <div className="mt-4 space-y-3">
                            <div className="relative group">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2A6CF0] transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search drafts..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2A6CF0]/20 focus:bg-white transition-all"
                                />
                            </div>
                            <Link 
                                href="/draftcreation/history"
                                className="flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all group/all"
                            >
                                <div className="flex items-center gap-2">
                                    <History size={14} className="group-hover/all:rotate-12 transition-transform" />
                                    View Detailed History
                                </div>
                                <ExternalLink size={12} className="opacity-50 group-hover/all:opacity-100 transition-opacity" />
                            </Link>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-2 pb-4 space-y-1 scrollbar-none hover:scrollbar-thin scrollbar-thumb-gray-200" data-lenis-prevent="true">
                    {isOpen ? (
                        loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 w-full rounded-xl bg-gray-50 animate-pulse" />
                            ))
                        ) : filteredDrafts.length === 0 ? (
                            <div className="py-12 text-center">
                                <FileText size={40} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">No drafts found</p>
                            </div>
                        ) : (
                            filteredDrafts.map(draft => (
                                <button
                                    key={draft.DraftId}
                                    onClick={() => { onSelectDraft(draft); if (window.innerWidth < 768) onToggle(); }}
                                    className={`w-full group text-left p-3 rounded-xl transition-all relative ${currentDraftId === draft.DraftId
                                            ? 'bg-[#2A6CF0]/5 ring-1 ring-[#2A6CF0]/30'
                                            : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex flex-col gap-0.5 pr-6">
                                        <span className={`text-xs font-bold uppercase ${currentDraftId === draft.DraftId ? 'text-[#2A6CF0]' : 'text-gray-400'
                                            }`}>
                                            {draft.TypeLabel || draft.Type.replace('_', ' ')}
                                        </span>
                                        <span className={`text-sm font-semibold truncate ${currentDraftId === draft.DraftId ? 'text-gray-900' : 'text-gray-700'
                                            }`}>
                                            {draft.Topic}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(draft.CreatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div
                                            onClick={(e) => handleDelete(e, draft.DraftId)}
                                            className="p-1.5 hover:bg-rose-50 text-gray-300 hover:text-rose-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </div>
                                    </div>
                                </button>
                            ))
                        )
                    ) : (
                        !loading && filteredDrafts.map(draft => (
                            <button
                                key={draft.DraftId}
                                onClick={() => onSelectDraft(draft)}
                                title={draft.Topic}
                                className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center transition-all ${currentDraftId === draft.DraftId
                                        ? 'bg-[#2A6CF0] text-white shadow-md'
                                        : 'text-gray-400 hover:bg-gray-100'
                                    }`}
                            >
                                <FileText size={20} />
                            </button>
                        ))
                    )}
                </div>

                {/* Personalization Section */}
                {isOpen && (
                    <div className="mt-auto border-t border-gray-100 p-4">
                        {!showProfile ? (
                            <button 
                                onClick={() => setShowProfile(true)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                                        <Sparkles size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-slate-800">Personalize drafts</p>
                                        <p className="text-[10px] text-slate-500">Auto-fill your details</p>
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                            </button>
                        ) : (
                            <div className="space-y-3 bg-slate-50 rounded-2xl p-3 border border-slate-100 animate-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Your Profile</span>
                                    <button onClick={() => setShowProfile(false)} className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase">Close</button>
                                </div>
                                <div className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Full Name" 
                                        value={profile.full_name}
                                        onChange={e => setProfile({...profile, full_name: e.target.value})}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                    />
                                    <textarea 
                                        placeholder="Full Address" 
                                        value={profile.address}
                                        onChange={e => setProfile({...profile, address: e.target.value})}
                                        rows={2}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none resize-none"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Contact #" 
                                            value={profile.contact_number}
                                            onChange={e => setProfile({...profile, contact_number: e.target.value})}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        />
                                        <input 
                                            type="email" 
                                            placeholder="Email" 
                                            value={profile.email}
                                            onChange={e => setProfile({...profile, email: e.target.value})}
                                            className="w-full px-3 py-1.5 bg-white border border-slate-100 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                                        />
                                    </div>
                                </div>
                                <button 
                                    onClick={saveProfile}
                                    disabled={savingProfile}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50"
                                >
                                    {savingProfile ? "Saving..." : "Save Details"}
                                </button>
                                <p className="text-[9px] text-slate-400 text-center italic">These details will auto-fill "Your Name" etc. in drafts.</p>
                            </div>
                        )}
                    </div>
                )}
            </aside>
        </>
    );
}
