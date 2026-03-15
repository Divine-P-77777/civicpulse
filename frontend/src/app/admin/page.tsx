'use client';

import { useUser, useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Database, HardDrive, FileArchive, UploadCloud, Moon, Sun, Menu, X as CloseIcon, Home } from 'lucide-react';

import DashboardTab from './components/DashboardTab';
import IngestionTab from './components/IngestionTab';
import VectorsTab from './components/VectorsTab';
import DynamoDBTab from './components/DynamoDBTab';
import S3Tab from './components/S3Tab';
import DraftHistoryTab from './components/DraftHistoryTab';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .replace(/[\[\]'"]/g, '')
    .split(',')
    .map(e => e.trim());
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'overview' | 'ingestion' | 'drafts' | 'vectors' | 'dynamodb' | 's3';

function AdminContent() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // ─── Theme Persistence ───
    useEffect(() => {
        const saved = localStorage.getItem('admin-theme');
        if (saved) {
            setIsDarkMode(saved === 'dark');
        } else {
            setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
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
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 text-center max-w-md shadow-xl border border-gray-100 dark:border-slate-800">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Admin Access Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Sign in with an authorized account to access the CivicPulse Admin Dashboard.</p>
                    <SignInButton mode="modal">
                        <button className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-4 px-8 rounded-2xl transition-all shadow-lg active:scale-[0.98]">
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
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center max-w-md shadow-xl border border-red-100 dark:border-red-900/30">
                    <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-2xl">🚫</span>
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
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            className="lg:hidden p-2.5 rounded-xl bg-white text-black border dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <CloseIcon size={20} /> : <Menu size={20} />}
                        </button>
                        <div>
                            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Admin Panel</h2>
                            <p className={isDarkMode ? 'text-slate-400 text-xs sm:text-sm' : 'text-slate-500 text-xs sm:text-sm'}>CivicPulse Data Pipeline & Storage</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all ${isDarkMode ? 'bg-slate-800 text-yellow-400 border border-slate-700 hover:bg-slate-700' : 'bg-white text-slate-600 hover:bg-gray-50 shadow-sm border border-slate-200'}`}>
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <div className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all shadow-sm ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8' } }} />
                        </div>
                    </div>
                </header>

                {/* Tab Navigation (Desktop) */}
                <div className={`hidden lg:flex gap-1.5 p-1.5 rounded-2xl shadow-sm border transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                            className={`flex flex-1 items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.key
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
                <div className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="p-6 space-y-8">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xl dark:text-white">Admin Menu</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 dark:text-slate-400"><CloseIcon size={20} /></button>
                        </div>
                        <nav className="space-y-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-[#2A6CF0] text-white shadow-md'
                                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {tab.icon} {tab.label}
                                </button>
                            ))}
                        </nav>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-medium transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                            <Home size={20} /> Back to Home
                        </button>
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
