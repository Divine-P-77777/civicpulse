'use client';

import { useUser, useAuth, UserButton, SignInButton } from '@clerk/nextjs';
import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Database, HardDrive, FileArchive, UploadCloud, Moon, Sun } from 'lucide-react';

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

type Tab = 'dashboard' | 'ingestion' | 'vectors' | 'dynamodb' | 's3';

export default function AdminPage() {
    const { user, isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(false);

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
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
            <div className="w-10 h-10 border-3 border-[#2A6CF0] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!isSignedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="bg-white rounded-2xl p-10 text-center max-w-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <span className="text-3xl">🔒</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
                    <p className="text-gray-500 mb-6">Sign in to access the CivicPulse Admin Dashboard.</p>
                    <SignInButton mode="modal">
                        <button className="bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.3)] cursor-pointer">
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
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F8FBFF 0%, #E6F2FF 100%)' }}>
                <div className="bg-white rounded-2xl p-8 text-center max-w-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[#E45454]/20">
                    <div className="w-14 h-14 bg-[#E45454]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🚫</span></div>
                    <h2 className="text-xl font-bold text-[#E45454] mb-2">Access Denied</h2>
                    <p className="text-gray-600">Logged in as <span className="font-mono text-gray-900">{primaryEmail}</span> — not on the admin whitelist.</p>
                    <div className="mt-4"><UserButton /></div>
                </div>
            </div>
        );
    }

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
        { key: 'ingestion', label: 'Ingestion', icon: <UploadCloud size={18} /> },
        { key: 'vectors', label: 'Vectors', icon: <Database size={18} /> },
        { key: 'dynamodb', label: 'DynamoDB', icon: <HardDrive size={18} /> },
        { key: 's3', label: 'S3 Files', icon: <FileArchive size={18} /> },
    ];

    return (
        <div className={`min-h-screen p-6 lg:p-8 transition-colors duration-300 ${isDarkMode ? 'bg-[#0F172A] text-gray-100' : 'bg-gradient-to-br from-[#F8FBFF] to-[#E6F2FF] text-gray-900'}`}>
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <header className="flex justify-between items-center">
                    <div>
                        <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Admin Dashboard</h2>
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500 text-sm'}>Manage your CivicPulse data pipeline and storage.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2 rounded-full transition ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm border border-gray-200'}`}>
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <UserButton />
                    </div>
                </header>

                {/* Tab Navigation */}
                <div className={`flex gap-1 p-1.5 rounded-2xl shadow-sm backdrop-blur-sm border transition-colors ${isDarkMode ? 'bg-gray-800/80 border-gray-700/60' : 'bg-white/80 border-gray-200/60'}`}>
                    {tabs.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex flex-1 items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${activeTab === tab.key
                                ? 'bg-[#2A6CF0] text-white shadow-[0_4px_14px_rgba(42,108,240,0.25)]'
                                : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                                }`}>
                            {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Routines */}
                {activeTab === 'dashboard' && <DashboardTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                {activeTab === 'ingestion' && <IngestionTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                {activeTab === 'vectors' && <VectorsTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                {activeTab === 'dynamodb' && <DynamoDBTab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
                {activeTab === 's3' && <S3Tab isDarkMode={isDarkMode} authFetch={authFetch} API_BASE={API_BASE} />}
            </div>
        </div>
    );
}
