'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PenTool, ScrollText, Search, Home, Shield, Scale } from 'lucide-react';

interface WelcomeScreenProps {
    onSetInput: (val: string) => void;
}

const QUICK_PROMPTS = [
    { q: 'What are my fundamental rights?', icon: <ScrollText size={24} /> },
    { q: 'Explain RTI Act simply', icon: <Search size={24} /> },
    { q: 'My landlord rights as a tenant', icon: <Home size={24} /> },
    { q: 'Consumer complaint process', icon: <Shield size={24} /> },
];

export default function WelcomeScreen({ onSetInput }: WelcomeScreenProps) {
    const router = useRouter();

    return (
        <div className="flex items-center justify-center min-h-[42vh] py-4">
            <div className="text-center w-full max-w-xl px-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#2A6CF0]/10 to-[#4CB782]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <Scale size={40} className="text-[#2A6CF0]" strokeWidth={1.5} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    I&apos;m your AI legal advisor. Ask me about your rights, laws, or civic issues — I&apos;ll explain everything in simple language.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:max-w-md mx-auto">
                    {QUICK_PROMPTS.map((item) => (
                        <button key={item.q} onClick={() => onSetInput(item.q)}
                            className="p-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 hover:border-[#2A6CF0]/30 hover:shadow-[0_4px_14px_rgba(42,108,240,0.08)] transition-all text-left group">
                            <span className="text-[#2A6CF0] block mb-2">{item.icon}</span>
                            <span className="text-gray-600 font-medium group-hover:text-gray-900 transition">{item.q}</span>
                        </button>
                    ))}
                </div>

                {/* Draft Creation Shortcut */}
                <button
                    onClick={() => router.push('/draftcreation')}
                    className="mt-4 w-full sm:max-w-md mx-auto flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl hover:border-[#2A6CF0]/40 hover:shadow-[0_4px_14px_rgba(42,108,240,0.10)] transition-all group"
                >
                    <div className="w-9 h-9 bg-[#2A6CF0]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#2A6CF0]/20 transition-all">
                        <PenTool className="w-4 h-4 text-[#2A6CF0]" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-800">Create a Draft</p>
                        <p className="text-xs text-slate-400">Complaint, legal notice, RTI &amp; more</p>
                    </div>
                    <span className="ml-auto text-xs text-[#2A6CF0] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                </button>
            </div>
        </div>
    );
}
