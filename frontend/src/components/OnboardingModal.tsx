'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
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
            <style jsx global>{`
              .react-calendar {
                border: 1px solid #e2e8f0;
                border-radius: 0.75rem;
                font-family: inherit;
                padding: 10px;
                width: 100%;
                box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
              }
              .react-calendar__navigation button {
                border-radius: 0.5rem;
              }
              .react-calendar__navigation button:hover,
              .react-calendar__navigation button:focus {
                background-color: #f1f5f9;
              }
              .react-calendar__tile--active {
                background: #4f46e5 !important;
                border-radius: 0.5rem;
              }
              .react-calendar__tile--active:enabled:hover,
              .react-calendar__tile--active:enabled:focus {
                background: #4338ca !important;
              }
              .react-calendar__tile {
                border-radius: 0.5rem;
              }
              .react-calendar__tile:enabled:hover,
              .react-calendar__tile:enabled:focus {
                background-color: #f1f5f9;
              }
            `}</style>
            <Calendar
              onChange={setDate}
              value={date}
              className="w-full"
            />
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
              className={`flex-1 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors ${
                agreedToTerms
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
