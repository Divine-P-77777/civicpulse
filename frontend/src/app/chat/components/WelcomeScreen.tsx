'use client';

import React from 'react';

interface WelcomeScreenProps {
    onSetInput: (val: string) => void;
}

const QUICK_PROMPTS = [
    { q: 'What are my fundamental rights?', icon: '📜' },
    { q: 'Explain RTI Act simply', icon: '🔍' },
    { q: 'My landlord rights as a tenant', icon: '🏠' },
    { q: 'Consumer complaint process', icon: '🛡️' },
];

export default function WelcomeScreen({ onSetInput }: WelcomeScreenProps) {
    return (
        <div className="flex items-center justify-center min-h-[55vh]">
            <div className="text-center max-w-lg px-4">
                <div className="w-20 h-20 bg-gradient-to-br from-[#2A6CF0]/10 to-[#4CB782]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <span className="text-4xl">⚖️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
                <p className="text-gray-500 mb-8 leading-relaxed">
                    I&apos;m your AI legal advisor. Ask me about your rights, laws, or civic issues — I&apos;ll explain everything in simple language.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                    {QUICK_PROMPTS.map((item) => (
                        <button key={item.q} onClick={() => onSetInput(item.q)}
                            className="p-3.5 bg-white border border-gray-200 rounded-2xl text-sm text-gray-700 hover:border-[#2A6CF0]/30 hover:shadow-[0_4px_14px_rgba(42,108,240,0.08)] transition-all text-left group">
                            <span className="text-lg block mb-1">{item.icon}</span>
                            <span className="text-gray-600 group-hover:text-gray-900 transition">{item.q}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
