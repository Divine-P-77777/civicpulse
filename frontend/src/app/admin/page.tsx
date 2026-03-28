'use client';

import { useUser, useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import React, { useState, useEffect, useCallback, Suspense, useLayoutEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Database, HardDrive, FileArchive, UploadCloud, Moon, Sun, Menu, X as CloseIcon, Home, Lock, ShieldAlert } from 'lucide-react';

import DashboardTab from './components/DashboardTab';
import IngestionTab from './components/IngestionTab';
import VectorsTab from './components/VectorsTab';
import DynamoDBTab from './components/DynamoDBTab';
import S3Tab from './components/S3Tab';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .replace(/[\[\]'"]/g, '')
    .split(',')
    .map(e => e.trim());
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'overview' | 'ingestion' | 'vectors' | 'dynamodb' | 's3';

function AdminContent() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ─── Theme Persistence (Synchronous where possible) ───
    useLayoutEffect(() => {
        const saved = localStorage.getItem('admin-theme');
        if (saved) {
            const isDark = saved === 'dark';
            setIsDarkMode(isDark);
            if (isDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(prefersDark);
            if (prefersDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('admin-theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);
    useEffect(() => {
        const tab = searchParams.get('tab') as Tab;
        if (tab && ['overview', 'ingestion', 'vectors', 'dynamodb', 's3'].includes(tab)) {
            setActiveTab(tab);
        } else if (!tab) {
            router.replace('/admin?tab=overview');
        }
    }, [searchParams, router]);

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        setIsMobileMenuOpen(false);
        const params = new URLSearchParams(searchParams);
        params.set('tab', tab);
        router.push(`/admin?${params.toString()}`);
    };

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const token = await getToken();
        return fetch(url, {
            ...options,
            headers: { ...options.headers as Record<string, string>, 'Authorization': `Bearer ${token}` },
        });
    }, [getToken]);

    // ─── Theme Toggle ───
    useEffect(() => {
        if (isDarkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDarkMode]);

    // ─── Auth Guards ───
    if (!isLoaded) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
            <div className="w-10 h-10 border-3 border-[#2A6CF0] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-center max-w-md shadow-2xl border border-gray-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-[#2A6CF0]" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Admin Access Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in with an authorized account to access the CivicPulse Admin Dashboard.</p>
                    <SignInButton mode="modal">
                        <button className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-4 px-8 rounded-[1.25rem] transition-all shadow-lg active:scale-[0.98]">
                            Sign In
                        </button>
                    </SignInButton>
                </div>
            </div>
        );
    }

    const primaryEmail = user?.primaryEmailAddress?.emailAddress;
    const isAuthorized = primaryEmail && ADMIN_EMAILS.includes(primaryEmail);

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 text-center max-w-md shadow-2xl border border-red-100 dark:border-red-900/30">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-[1.25rem] flex items-center justify-center mx-auto mb-5">
                        <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Access Denied</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                        Logged in as <span className="font-mono text-gray-900 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded italic break-all">{primaryEmail}</span>. This email is not on the admin whitelist.
                    </p>
                    <div className="flex justify-center"><UserButton /></div>
                </div>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
        { key: 'ingestion', label: 'Ingestion', icon: <UploadCloud size={18} /> },
        { key: 'vectors', label: 'Vectors', icon: <Database size={18} /> },
        { key: 'dynamodb', label: 'DynamoDB', icon: <HardDrive size={18} /> },
        { key: 's3', label: 'S3 Files', icon: <FileArchive size={18} /> },
    ];

    return (
        <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#0F172A] text-gray-100' : 'bg-[#F8FBFF] text-gray-900'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">

                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-2">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden w-12 h-12 flex items-center justify-center rounded-[1.25rem] bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all text-slate-600 dark:text-slate-400"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
                        </button>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Admin Panel</h2>
                                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                            <p className={isDarkMode ? 'text-slate-400 text-xs sm:text-sm font-medium' : 'text-slate-500 text-xs sm:text-sm font-medium'}>
                                Managing CivicPulse Node & Vector Storage
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className={`flex-1 sm:flex-none flex items-center p-1.5 rounded-[1.25rem] border transition-all ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <button 
                                onClick={() => setIsDarkMode(!isDarkMode)} 
                                className={`flex-1 sm:w-11 h-11 flex items-center justify-center rounded-xl transition-all ${isDarkMode ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <div className="flex-1 sm:w-11 h-11 flex items-center justify-center">
                                <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab Navigation (Desktop) */}
                <div className={`hidden lg:flex gap-1.5 p-1.5 rounded-[1.5rem] shadow-sm border transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                            className={`flex flex-1 items-center justify-center gap-2.5 py-3 px-4 rounded-[1.125rem] text-sm font-semibold transition-all ${activeTab === tab.key
                                ? 'bg-[#2A6CF0] text-white shadow-lg'
                                : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Mobile Menu Backdrop */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Mobile Side Menu */}
                <div className={`fixed inset-y-4 left-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-[2.5rem] transform backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] transition-all duration-500 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[110%]'} ${isDarkMode ? 'bg-slate-900/98 border border-slate-800/50' : 'bg-white/95 border border-white/20'}`}>
                    <div className="flex flex-col h-full">
                        {/* Menu Header */}
                        <div className={`p-8 border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                            <div className="flex items-center justify-between mb-8">
                                <Link href="/" className="flex items-center gap-2 group">
                                    <div className="w-10 h-10 bg-[#2A6CF0] rounded-[1rem] flex items-center justify-center shadow-lg shadow-[#2A6CF0]/20 transition-transform group-hover:scale-105">
                                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <span className={`text-xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>CivicPulse</span>
                                </Link>
                                <button
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`p-3 rounded-[1.25rem] transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-50 text-gray-500 hover:text-black'}`}
                                >
                                    <CloseIcon size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`p-1.5 rounded-full border-2 ${isDarkMode ? 'border-indigo-900/30' : 'border-indigo-100'}`}>
                                    <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-10 h-10' } }} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.1em] mb-0.5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Administrator</p>
                                    <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{user?.fullName || 'Root Access'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                            <p className={`px-5 text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Management</p>
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] text-sm font-bold transition-all relative group ${activeTab === tab.key
                                        ? 'bg-[#2A6CF0] text-white shadow-[0_12px_24px_-8px_rgba(42,108,240,0.4)]'
                                        : isDarkMode ? 'text-slate-400 hover:bg-slate-800/50 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <span className={`${activeTab === tab.key ? 'text-white' : isDarkMode ? 'text-slate-500 group-hover:text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'} transition-colors`}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                    {activeTab === tab.key && (
                                        <div className="absolute right-5 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Menu Footer */}
                        <div className={`p-6 border-t rounded-b-[2.5rem] ${isDarkMode ? 'border-slate-800 bg-slate-800/20' : 'border-gray-100 bg-gray-50/50'}`}>
                            <button
                                onClick={() => router.push('/')}
                                className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-[1.25rem] text-sm font-bold transition-all shadow-sm border hover:shadow-md active:scale-[0.98] ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-gray-700 border-gray-100'}`}
                            >
                                <Home size={18} /> Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>


                {/* Main Content Area */}
                <main className="min-h-[60vh] animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="w-full">
                        {activeTab === 'overview' && <DashboardTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                        {activeTab === 'ingestion' && <IngestionTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                        {activeTab === 'vectors' && <VectorsTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                        {activeTab === 'dynamodb' && <DynamoDBTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                        {activeTab === 's3' && <S3Tab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="w-10 h-10 border-3 border-[#2A6CF0] border-t-transparent rounded-full animate-spin"></div>
            </div>
        }>
            <AdminContent />
        </Suspense>
    );
}
