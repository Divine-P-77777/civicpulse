'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

import { X } from 'lucide-react';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function OnboardingModal() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<Value>(new Date());
  const [isMounted, setIsMounted] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check if user is signed in and hasn't seen the onboarding yet
    if (isLoaded && isSignedIn) {
      const hasOnboarded = localStorage.getItem(`onboarded_${user?.id}`);
      if (!hasOnboarded) {
        setIsOpen(true);
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const handleClose = () => {
    setIsOpen(false);
    if (user?.id) {
      localStorage.setItem(`onboarded_${user.id}`, 'true');
    }
  };

  const handleComplete = () => {
    // Collect the date or other onboarding info
    console.log('Selected Date:', date);
    handleClose();
  };

  if (!isMounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
          <h2 className="text-xl font-bold font-heading">Welcome to CivicPulse</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 mb-6 text-center">
            Hi {user?.firstName || 'there'}! Please select a relevant date (like a court heading or document expiration) to personalize your experience.
          </p>

          <div className="flex justify-center mb-6">
            <div className="relative w-full max-w-[200px]">
              <input
                type="date"
                id="onboarding-date"
                value={date instanceof Date ? date.toISOString().split('T')[0] : ''}
                onChange={(e) => setDate(new Date(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 min-h-[44px] shadow-sm transition-all outline-none font-medium text-center cursor-pointer hover:bg-slate-100"
              />
            </div>
          </div>

          <div className="mb-6 flex items-start gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="terms" className="text-sm text-slate-600 leading-tight">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2">
                Terms and Conditions
              </Link>{' '}
              of using CivicPulse.
            </label>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleComplete}
              disabled={!agreedToTerms}
              className={`flex-1 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors ${agreedToTerms
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
