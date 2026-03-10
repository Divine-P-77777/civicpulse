'use client';

import Link from 'next/link';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';
import { CheckCircle2, Shield, Lock, Sliders, Menu, X, Mic } from 'lucide-react';
import { useState } from 'react';
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { NativeTypewriter } from '@/components/NativeTypewriter';
import ShinyText from '@/components/ui/shiny-text';
import { NativeButton } from '@/components/ui/native-button';
export default function Home() {
  const dispatch = useAppDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleModeSelect = (mode: 'live' | 'chat') => {
    dispatch(setCurrentMode(mode));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Hero Section */}
      <section className="relative w-full pt-16 pb-20 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Subtle background gradient blob (optional, based on design) */}
        <div className="absolute top-0 right-0 -mr-40 -mt-20 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            {/* Hero Text */}
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-5 lg:text-left pt-6 flex flex-col items-center lg:items-start">
              <div className="mb-6 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-4 py-1.5 shadow-sm">
                <ShinyText
                  text="✨ Welcome to the future"
                  speed={2}
                  delay={0}
                  color="#000000"
                  shineColor="#a1a1aa"
                  spread={120}
                  direction="left"
                  yoyo
                  pauseOnHover={false}
                  disabled={false}
                />
              </div>
              <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl text-balance">
                Understand Your Legal Rights in{" "}
                <div className="text-indigo-600 block mt-2">
                  <NativeTypewriter
                    content={[
                      "Simple Language.",
                      "Clear Explanations.",
                      "Real Rights."
                    ]}
                    loop
                    speed={80}
                    cursor={false}
                  />
                </div>
              </h1>
              <p className="mt-4 text-lg text-slate-600 sm:mt-5 sm:max-w-xl sm:mx-auto md:mt-6 lg:mx-0 text-balance">
                AI-powered tool that analyzes complex legal documents, assesses risk, and helps you take informed action in your language.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-4 sm:justify-center lg:justify-start">
                <NativeButton
                  glow
                  href="/live"
                  onClick={() => handleModeSelect('live')}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all hover:shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a5 5 0 1110 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Live Mode
                </NativeButton>
                <NativeButton
                  glow
                  href="/chat"
                  onClick={() => handleModeSelect('chat')}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-indigo-200 text-base font-semibold rounded-lg text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Chat Mode
                </NativeButton>
                <NativeButton
                  glow
                  href="/draftcreation"
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 text-base font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Make Draft
                </NativeButton>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 font-medium font-sans">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Analysis</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multiple Languages</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Safe</div>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-7 lg:flex lg:items-center">
              <div className="relative mx-auto w-full rounded-2xl shadow-2xl lg:max-w-2xl bg-white p-2 border border-slate-100 overflow-hidden transform -rotate-1 hover:rotate-0 transition-transform duration-500">
                  <img src="/hero-cartoon.png" alt="CivicPulse Friendly AI Assistant" className="w-full h-auto rounded-xl shadow-inner" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modes Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Choose Your Way to Get Help</h2>
            <p className="mt-4 text-xl text-slate-600">Two powerful AI tools designed for your convenience.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Live Mode Card */}
            <div className="bg-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a5 5 0 1110 0v6a3 3 0 01-3 3z" />
                    </svg>
                 </div>
                 <div>
                   <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md">Talking Assistant</span>
                   <h3 className="text-2xl font-bold text-slate-900 mt-1">Live Mode</h3>
                 </div>
              </div>
              <p className="text-slate-600 mb-8 flex-1">
                Real-time voice and video interaction. Get instant verbal guidance on documents you hold up to your camera.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3"><CheckCircle2 className="text-indigo-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Voice-activated guidance</span></li>
                <li className="flex gap-3"><CheckCircle2 className="text-indigo-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Visual document scanning</span></li>
                <li className="flex gap-3"><CheckCircle2 className="text-indigo-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Real-time Q&A</span></li>
              </ul>
              <Link
                href="/live"
                onClick={() => handleModeSelect('live')}
                className="w-full text-center block px-6 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
              >
                Try Live Mode
              </Link>
            </div>

            {/* Chat Mode Card */}
            <div className="bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 p-8 flex flex-col">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                 </div>
                 <div>
                   <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded-md">Deep Analysis</span>
                   <h3 className="text-2xl font-bold text-slate-900 mt-1">Chat Mode</h3>
                 </div>
              </div>
              <p className="text-slate-600 mb-8 flex-1">
                Upload PDF images for detailed analysis. Chat with our AI to understand clauses, detect risks, and draft responses.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Deep document analysis</span></li>
                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Interactive text highlights</span></li>
                <li className="flex gap-3"><CheckCircle2 className="text-emerald-500 shrink-0 w-5 h-5" /> <span className="text-slate-700 font-medium">Downloadable reports</span></li>
              </ul>
              <Link
                href="/chat"
                onClick={() => handleModeSelect('chat')}
                className="w-full text-center block px-6 py-4 border border-transparent text-base font-bold rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 shadow-md transition-all"
              >
                Start Document Analysis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Detection Section */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Instant Risk Detection</h2>
            <p className="mt-4 text-lg text-slate-600">We highlight potentially problematic clauses so you know exactly what to watch out for.</p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <div className="w-16 h-16 rounded-full bg-red-500 animate-pulse"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">High Risk</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-100"></div>
                <p className="text-sm font-medium text-slate-700"><span className="text-red-500 font-bold px-1.5 py-0.5 rounded bg-red-50">!</span> Unfair terms favoring the other party, hidden fees, or critical obligations.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <div className="w-16 h-16 rounded-full bg-amber-500"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Medium Risk</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-100"></div>
                <p className="text-sm font-medium text-slate-700"><span className="text-amber-500 font-bold px-1.5 py-0.5 rounded bg-amber-50">?</span> Standard clauses that require your attention to ensure they meet your specific needs.</p>
              </div>
            </div>

            <div className="flex flex-col items-center text-center max-w-xs">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                <div className="w-16 h-16 rounded-full bg-emerald-500"></div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Safe</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 relative">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-100"></div>
                <p className="text-sm font-medium text-slate-700"><span className="text-emerald-500 font-bold px-1.5 py-0.5 rounded bg-emerald-50">✓</span> Standard protections that follow common legal norms and pose no issue.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Simple Process, Powerful Results</h2>
          </div>

          <div className="relative">
            {/* Connecting line for md+ screens */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-indigo-100"></div>

            <div className="grid md:grid-cols-4 gap-12 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-50 shadow-md flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-4 ring-white">1</div>
                  <UserIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Sign Up Free</h3>
                <p className="text-sm text-slate-600">Create your account in seconds.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-50 shadow-md flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-4 ring-white">2</div>
                  <MessageCircleIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Choose Your Mode</h3>
                <p className="text-sm text-slate-600">Use Live Camera or upload documents.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-50 shadow-md flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-4 ring-white">3</div>
                  <Shield className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">AI Analysis</h3>
                <p className="text-sm text-slate-600">Instant extraction and risk assessment.</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-indigo-50 shadow-md flex items-center justify-center mb-6 relative">
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-4 ring-white">4</div>
                  <FileTextIcon className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Take Action</h3>
                <p className="text-sm text-slate-600">Understand, draft response, or seek lawyer.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Everything You Need</h2>
            <p className="mt-4 text-lg text-slate-600">Built to make legal understanding accessible and secure.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl mb-6">
                <Mic className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">24/7 AI Help</h3>
              <p className="text-slate-600 leading-relaxed">Access expert-level analysis anytime. Features seamless Voice interaction and powerful OCR document scanning.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 flex items-center justify-center rounded-xl mb-6">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Risk Flags</h3>
              <p className="text-slate-600 leading-relaxed">Instantly spot danger. Our system categorizes clauses into intuitive Red, Yellow, and Green risk levels.</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-xl mb-6">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure History</h3>
              <p className="text-slate-600 leading-relaxed">Private by design. Your analysis history and documents are encrypted and kept strictly confidential.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section className="py-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 pattern-grid-lg opacity-20"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-6">Speak Your Language</h2>
          <p className="text-indigo-100 max-w-2xl mx-auto text-lg mb-12">Available in English, Hindi, and several local Indian languages.</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada'].map((lang) => (
              <span key={lang} className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white font-semibold transition-colors cursor-default border border-white/30 shadow-sm">
                {lang}
              </span>
            ))}
          </div>
          <p className="mt-8 text-white/70 text-sm">And many more coming soon...</p>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Your Privacy, Our Priority</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 text-center max-w-5xl mx-auto">
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                <Lock className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Encrypted Storage</h3>
              <p className="text-slate-600">Your documents are encrypted both in transit and at rest. We cannot read your files.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Authentication</h3>
              <p className="text-slate-600">Protected accounts with strict access controls to ensure only you access your profile.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                <Sliders className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Data Control</h3>
              <p className="text-slate-600">You retain full ownership. Delete your documents from our servers at any time with one click.</p>
            </div>
          </div>
          <div className="mt-12 text-center">
             <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-600 transition-all mr-6">Privacy Policy</Link>
             <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 decoration-indigo-200 hover:decoration-indigo-600 transition-all">Terms of Service</Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-50 py-24 border-t border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl tracking-tight font-extrabold text-slate-900 sm:text-4xl text-balance">
            Ready to Understand Your Rights?
          </h2>
          <p className="mt-4 text-xl text-slate-600">
            Join thousands of users taking control of their legal documents.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <button
                  className="px-8 py-3.5 border border-transparent text-lg font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
                >
                  Create Free Account
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/chat"
                className="px-8 py-3.5 border border-transparent text-lg font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <Link
              href="/live"
              className="px-8 py-3.5 border-2 border-slate-300 text-lg font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all"
            >
              Watch Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Match Design */}
      <div className="px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8 lg:pb-12 bg-slate-50">
        <footer className="bg-[#1e2330] text-slate-300 py-16 rounded-3xl shadow-2xl overflow-hidden relative border border-slate-700/50">
          <div className="max-w-7xl mx-auto px-8 sm:px-12">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
              <div className="col-span-2 lg:col-span-2">
                <Link href="/" className="flex items-center gap-2 mb-6 w-max">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-2xl font-bold text-white tracking-tight">CivicPulse</span>
                </Link>
                <p className="text-slate-400 max-w-xs text-sm">
                  Empowering individuals to understand their legal rights through AI assistance.
                </p>
              </div>
              
              <div>
                <h4 className="text-white font-bold mb-4">Tools</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/live" className="hover:text-white transition-colors">Live Mode</Link></li>
                  <li><Link href="/chat" className="hover:text-white transition-colors">Chat Mode</Link></li>
                  <li><Link href="/draftcreation" className="hover:text-white transition-colors">Make Draft</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4">Account</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/admin" className="hover:text-white transition-colors flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Admin Dashboard</Link></li>
                  <li><Link href="/settings" className="hover:text-white transition-colors">Profile Settings</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-bold mb-4">Legal</h4>
                <ul className="space-y-3 text-sm">
                  <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-16 pt-8 border-t border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
              <p className="text-slate-400">© 2026 CivicPulse. All rights reserved.</p>
              <div className="flex gap-6 z-10">
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="#" className="hover:text-white transition-colors">Help Center</Link>
              </div>
            </div>

            {/* Massive modern typography text */}
            <div className="mt-12 w-full flex justify-center overflow-hidden opacity-5 pointer-events-none select-none">
              <span className="text-[12rem] leading-none font-black tracking-tighter text-white">
                CivicPulse
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Minimal icon components for the Process section
function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function MessageCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}