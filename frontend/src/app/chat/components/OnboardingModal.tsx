'use client';

import React from 'react';

interface OnboardingModalProps {
    fullName: string;
    dob: string;
    onNameChange: (val: string) => void;
    onDobChange: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function OnboardingModal({ fullName, dob, onNameChange, onDobChange, onSubmit }: OnboardingModalProps) {
    return (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-gray-100" data-lenis-prevent>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-[#2A6CF0]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">👋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome to CivicPulse!</h2>
                    <p className="text-gray-500 mt-2">Let&apos;s set up your profile quickly.</p>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => onNameChange(e.target.value)}
                            placeholder="e.g. Arjun Sharma" required
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#2A6CF0] focus:border-transparent outline-none transition bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
                        <input type="date" value={dob} onChange={(e) => onDobChange(e.target.value)} required
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-[#2A6CF0] focus:border-transparent outline-none transition bg-gray-50" />
                    </div>
                    <button type="submit"
                        className="w-full bg-[#2A6CF0] hover:bg-[#2259D6] text-white font-semibold py-3 rounded-xl transition-all shadow-[0_4px_14px_rgba(42,108,240,0.3)] mt-2">
                        Get Started →
                    </button>
                </form>
            </div>
        </div>
    );
}
