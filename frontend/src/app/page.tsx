'use client';

import Link from 'next/link';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';
import {
  CheckCircle2, Shield, Lock, Sliders, Mic,
  Receipt, Landmark, Gavel, Eye, Car,
  Users, Briefcase, Sprout, Globe, Building2,
  Database, BookOpen, Binary, Library, Vote,
  PenTool, ArrowRight, Camera, FileText, AlertTriangle
} from 'lucide-react';
import { useState } from 'react';
import { SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { NativeTypewriter } from '@/components/ui/NativeTypewriter';
import ShinyText from '@/components/ui/shiny-text';
import { NativeButton } from '@/components/ui/native-button';
import StarBorder from '@/components/ui/StarBorder';
import SpotlightCard from '@/components/ui/SpotlightCard';
import GlareHover from '@/components/ui/GlareHover';
import { MicIcon } from '@/components/ui/MicIcon';

export default function Home() {
  const dispatch = useAppDispatch();
  const { isLoaded, isSignedIn } = useUser();

  const handleModeSelect = (mode: 'live' | 'chat') => {
    dispatch(setCurrentMode(mode));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500 selection:text-white">

      {/* ──────────────────────────────────────────────────────────
          1. HERO SECTION - INSTANT PLATFORM CLARITY
         ────────────────────────────────────────────────────────── */}
      <section className="relative w-full pt-16 pb-16 lg:pt-24 lg:pb-24 overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-slate-50">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-40 -mt-20 w-96 h-96 bg-indigo-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-40 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-center">
            
            {/* Hero Left: Message & Value Proposition */}
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-7 lg:text-left pt-4 flex flex-col items-center lg:items-start">
              
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 backdrop-blur-sm px-4 py-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <ShinyText
                  text="AI Legal Assistant for Indian Citizens"
                  speed={2}
                  delay={0}
                  color="#4338ca"
                  shineColor="#818cf8"
                  spread={120}
                  direction="left"
                  yoyo
                  pauseOnHover={false}
                  disabled={false}
                />
              </div>

              {/* Headline */}
              <h1 className="text-4xl text-center lg:text-left sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                Understand Your Legal Rights <br />
                <span className="text-indigo-600 inline-block mt-1 sm:mt-2">
                  <NativeTypewriter
                    content={[
                      "In Plain Simple Words.",
                      "With Instant Risk Alerts.",
                      "In Hindi & English.",
                      "Without Expensive Lawyers."
                    ]}
                    loop
                    speed={80}
                    cursor={true}
                  />
                </span>
              </h1>

              {/* Plain-English Explanation */}
              <p className="mt-5 text-center lg:text-left text-base sm:text-lg text-slate-600 sm:max-w-xl sm:mx-auto lg:mx-0 leading-relaxed">
                CivicPulse is your free personal legal AI. <strong>Hold any legal paper up to your camera</strong>, upload agreements to spot hidden traps in <span className="text-rose-600 font-semibold">Red</span>, <span className="text-amber-600 font-semibold">Yellow</span> & <span className="text-emerald-600 font-semibold">Green</span>, or generate formal legal letters and RTIs in seconds.
              </p>

              {/* 3-Step "How CivicPulse Works" Quick Strip (Immediate Clarity) */}
              <div className="mt-7 w-full max-w-xl bg-white/90 border border-slate-200/90 rounded-2xl p-3.5 shadow-sm grid grid-cols-3 gap-2 text-center">
                <div className="px-2 py-1">
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">1. Scan or Talk</span>
                  <span className="text-xs text-slate-600 font-medium">Camera or PDF</span>
                </div>
                <div className="px-2 py-1 border-x border-slate-200">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block">2. Spot Risks</span>
                  <span className="text-xs text-slate-600 font-medium">Traffic-Light Alerts</span>
                </div>
                <div className="px-2 py-1">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">3. Take Action</span>
                  <span className="text-xs text-slate-600 font-medium">Draft Legal Notice</span>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 sm:justify-center lg:justify-start w-full max-w-md sm:max-w-none mx-auto lg:mx-0">
                <NativeButton
                  glow
                  href="/live"
                  onClick={() => handleModeSelect('live')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent text-base font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all w-full sm:w-auto"
                >
                  <Mic className="w-5 h-5 text-white" />
                  Try Live Camera & Voice
                </NativeButton>

                <NativeButton
                  glow
                  href="/chat"
                  onClick={() => handleModeSelect('chat')}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-200 text-base font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition-all w-full sm:w-auto"
                >
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Check Document Risks
                </NativeButton>

                <Link
                  href="/draftcreation"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 border border-indigo-100 text-base font-semibold rounded-xl text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 transition-all w-full sm:w-auto"
                >
                  <PenTool className="w-4 h-4 text-indigo-600" />
                  Draft Letter / RTI
                </Link>
              </div>

              {/* Trust Features */}
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs sm:text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 100% Free for Citizens</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> English & हिन्दी (Hindi)</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Encrypted & Private</div>
              </div>
            </div>

            {/* Hero Right: Live Interactive Video Demo */}
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-md lg:mx-0 lg:col-span-5 lg:flex lg:items-center">
              <div className="relative mx-auto w-full aspect-[4/3] rounded-[2.5rem] shadow-2xl bg-white p-2 border-2 border-indigo-100 overflow-hidden transform lg:-rotate-1 hover:rotate-0 transition-transform duration-500">
                
                {/* Floating pill over video */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full shadow border border-white/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Camera Scan</span>
                </div>

                <div className="relative w-full h-full overflow-hidden rounded-[2rem] bg-slate-900">
                  <video
                    src="/hero.mp4"
                    title="CivicPulse Interactive Demo"
                    className="absolute inset-0 w-full h-full object-cover scale-[1.08]"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between text-white text-xs bg-slate-900/70 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
                    <span>Point camera at any notice or contract</span>
                    <span className="text-indigo-300 font-bold">Real-time AI</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          2. THE 3 CORE TOOLS (Live Mode, Chat Mode, Draft Creator)
         ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Simple & Powerful
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl mt-3">
              Three Ways CivicPulse Helps You
            </h2>
            <p className="mt-3 text-lg text-slate-600">
              Pick the tool that matches what you have in hand right now.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Tool 1: Live Mode */}
            <SpotlightCard
              className="bg-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-500 shadow-sm hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between"
              spotlightColor="rgba(99, 102, 241, 0.15)"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-13 h-13 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center p-3">
                    <MicIcon size={26} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">
                      Voice & Camera
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">Live Mode</h3>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Hold physical papers or contracts up to your camera. Speak naturally and get instant verbal explanations in Hindi or English.
                </p>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-indigo-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Real-time camera document scanning</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-indigo-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Hands-free voice Q&A in plain Hindi/English</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-indigo-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Instant answers to "Is this legal?"</span>
                  </li>
                </ul>
              </div>

              <StarBorder
                as={Link}
                href="/live"
                onClick={() => handleModeSelect('live')}
                color="magenta"
                speed="5s"
                className="w-full block rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                innerClassName="w-full text-center block px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Try Live Camera & Voice →
              </StarBorder>
            </SpotlightCard>

            {/* Tool 2: Chat Mode */}
            <SpotlightCard
              className="bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 shadow-sm hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between"
              spotlightColor="rgba(16, 185, 129, 0.15)"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-13 h-13 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center p-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                      Deep Audit
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">Chat Analysis</h3>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Upload agreements, rental leases, or notices. Our AI flags risky clauses, highlights unfair penalties, and explains legal options.
                </p>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-emerald-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Automatic clause risk classification</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-emerald-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Indian contract law & Supreme Court citations</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-emerald-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Interactive clause-by-clause chat</span>
                  </li>
                </ul>
              </div>

              <StarBorder
                as={Link}
                href="/chat"
                onClick={() => handleModeSelect('chat')}
                color="cyan"
                speed="5s"
                className="w-full block rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                innerClassName="w-full text-center block px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
              >
                Upload & Audit Document →
              </StarBorder>
            </SpotlightCard>

            {/* Tool 3: Draft Creator */}
            <SpotlightCard
              className="bg-white rounded-2xl border-2 border-blue-100 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 p-7 flex flex-col justify-between"
              spotlightColor="rgba(59, 130, 246, 0.15)"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="w-13 h-13 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center p-3">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                      Document Generator
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">Draft Creator</h3>
                  </div>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Turn legal disputes into ready-to-send documents. Generate formal RTIs, Consumer Court notices, legal replies, and affidavits.
                </p>
                <ul className="space-y-3 mb-8 text-sm">
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-blue-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">RTI applications with proper statutory format</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-blue-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">Consumer complaints & demand notices</span>
                  </li>
                  <li className="flex gap-2.5 items-start">
                    <CheckCircle2 className="text-blue-500 shrink-0 w-4 h-4 mt-0.5" />
                    <span className="text-slate-700 font-medium">One-click export to official PDF format</span>
                  </li>
                </ul>
              </div>

              <StarBorder
                as={Link}
                href="/draftcreation"
                color="cyan"
                speed="5s"
                className="w-full block rounded-xl shadow-sm transition-all hover:scale-[1.02]"
                innerClassName="w-full text-center block px-6 py-3.5 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Generate Legal Letter →
              </StarBorder>
            </SpotlightCard>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          3. RISK DETECTION (TRAFFIC LIGHT SYSTEM)
         ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Instant Traffic-Light Risk Detection</h2>
            <p className="mt-3 text-lg text-slate-600">We highlight every clause in plain colors so you instantly know what you are agreeing to.</p>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-12 max-w-5xl mx-auto">
            
            {/* Red Risk */}
            <div className="flex flex-col items-center text-center max-w-xs w-full">
              <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-5 shadow-sm border-4 border-white">
                <div className="w-14 h-14 rounded-full bg-red-500 animate-pulse flex items-center justify-center text-white font-extrabold text-2xl">!</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">High Risk</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 relative w-full text-left">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-red-600 block mb-1">Unfair or Illegal Terms:</strong> Excessive job bond penalties, non-refundable deposit forfeitures, or one-sided liability waivers.
                </p>
              </div>
            </div>

            {/* Yellow Risk */}
            <div className="flex flex-col items-center text-center max-w-xs w-full">
              <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center mb-5 shadow-sm border-4 border-white">
                <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center text-white font-extrabold text-2xl">?</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Medium Risk</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 relative w-full text-left">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-amber-600 block mb-1">Needs Attention:</strong> Ambiguous inspection clauses, auto-renewal contracts, or vague repair responsibilities.
                </p>
              </div>
            </div>

            {/* Green Risk */}
            <div className="flex flex-col items-center text-center max-w-xs w-full">
              <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-5 shadow-sm border-4 border-white">
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white font-extrabold text-2xl">✓</div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Safe</h3>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 relative w-full text-left">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong className="text-emerald-600 block mb-1">Standard & Balanced:</strong> Mutual 30-day notice periods, standard force majeure, and fair dispute mediation.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. PROCESS SECTION (4 STEPS)
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Simple 4-Step Process</h2>
            <p className="mt-3 text-lg text-slate-600">How any citizen can get legal clarity in under a minute.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative max-w-6xl mx-auto">
            
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-extrabold text-2xl flex items-center justify-center mb-5 shadow-sm">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Upload or Scan</h3>
              <p className="text-sm text-slate-600">Use Live Camera to scan physical paper or upload a PDF/image.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-extrabold text-2xl flex items-center justify-center mb-5 shadow-sm">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Indian Law Matching</h3>
              <p className="text-sm text-slate-600">Cross-referenced with BNS, IPC, Contract Act, and Supreme Court cases.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-extrabold text-2xl flex items-center justify-center mb-5 shadow-sm">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Color-Coded Risks</h3>
              <p className="text-sm text-slate-600">Get plain-English and Hindi explanations of Red, Yellow, Green clauses.</p>
            </div>

            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-extrabold text-2xl flex items-center justify-center mb-5 shadow-sm">
                4
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Take Action</h3>
              <p className="text-sm text-slate-600">Export audit report or auto-draft an RTI or formal legal complaint.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          5. LEGAL KNOWLEDGE BASE COVERAGE
         ────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Comprehensive Indian Legal Coverage</h2>
            <p className="mt-4 text-xl text-slate-600">CivicPulse references statutory Indian law and authoritative public legal repositories.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(79, 70, 229, 0.1)">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Receipt size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Taxation Laws</h3>
              <p className="text-sm text-slate-600 leading-relaxed">CGST, IGST, SGST Acts, GST dispute procedures, and refund timelines.</p>
            </SpotlightCard>

            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(16, 185, 129, 0.1)">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Landmark size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Constitutional Law</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Full coverage of the Indian Constitution, Fundamental Rights (Articles 14, 19, 21), and citizen duties.</p>
            </SpotlightCard>

            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(239, 68, 68, 0.1)">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4">
                <Gavel size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Criminal Law (BNS & IPC)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Bharatiya Nyaya Sanhita (BNS 2024), Indian Penal Code (IPC), and FIR citizen rights.</p>
            </SpotlightCard>

            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(37, 99, 235, 0.1)">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Library size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Court Precedents</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Case-based reasoning using landmark precedents from the <strong>Supreme Court of India</strong> and High Courts.</p>
            </SpotlightCard>

            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(245, 158, 11, 0.1)">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <Eye size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">RTI & Transparency</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Right to Information Act 2005 for filing queries against government agencies.</p>
            </SpotlightCard>

            <SpotlightCard className="bg-white p-6 rounded-2xl border border-slate-200/80" spotlightColor="rgba(107, 114, 128, 0.1)">
              <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mb-4">
                <Car size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg mb-2">Transportation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">Motor Vehicles Act and civil transportation rules across Indian states.</p>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          6. MULTILINGUAL ACCESS SECTION
         ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-blue-950 via-indigo-900 to-blue-950 relative overflow-hidden text-center text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl font-extrabold mb-4">Speak Your Language</h2>
          <p className="text-indigo-200 max-w-2xl mx-auto text-base sm:text-lg mb-10">
            Available in English and Hindi, with more local Indian languages actively expanding.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {['English', 'हिन्दी (Hindi)'].map((lang) => (
              <span key={lang} className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white font-semibold text-sm transition-colors border border-white/30 shadow-sm">
                {lang}
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </span>
            ))}
            {['Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada'].map((lang) => (
              <span key={lang} className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full text-white/60 font-medium text-xs sm:text-sm border border-white/10">
                {lang}
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-white/10 rounded text-white/70">
                  Soon
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          7. PRIVACY & SECURITY GUARANTEE
         ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900">Your Privacy, Our Priority</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 text-center max-w-5xl mx-auto">
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                <Lock className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Encrypted Storage</h3>
              <p className="text-sm text-slate-600">Your documents are encrypted both in transit and at rest. Your files stay confidential.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Authentication</h3>
              <p className="text-sm text-slate-600">Protected accounts with strict access controls to ensure only you access your data.</p>
            </div>
            <div>
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm border border-slate-100">
                <Sliders className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Data Control</h3>
              <p className="text-sm text-slate-600">You retain full ownership. Delete your documents from our servers at any time with one click.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          8. CALL TO ACTION (BOTTOM)
         ────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 border-t border-slate-200 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl tracking-tight font-extrabold text-slate-900 sm:text-4xl text-balance">
            Ready to Understand Your Rights?
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Join thousands of citizens taking control of their legal documents.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            {isLoaded && !isSignedIn && (
              <SignUpButton mode="modal">
                <button
                  className="px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
                >
                  Create Free Account
                </button>
              </SignUpButton>
            )}
            {isLoaded && isSignedIn && (
              <Link
                href="/chat"
                className="px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight size={16} />
              </Link>
            )}
            <Link
              href="/live"
              onClick={() => handleModeSelect('live')}
              className="px-8 py-3.5 border-2 border-slate-300 text-base font-bold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
            >
              <Mic size={18} className="text-indigo-600" /> Try Live Mode
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
