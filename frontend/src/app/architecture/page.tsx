"use client"
import React, { useState } from 'react';
import NextLink from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Cpu, 
    Database, 
    Zap, 
    MessageSquare, 
    FileText, 
    ChevronDown, 
    LayoutGrid, 
    Activity, 
    Shield, 
    Rocket
} from 'lucide-react';

import ArchitectureBoard from './components/ArchitectureBoard';
import ArchitecturePresentation from './components/ArchitecturePresentation';

import { IngestionFlowData } from './components/IngestionFlow';
import { LiveModeFlowData } from './components/LiveModeFlow';
import { ChatModeFlowData } from './components/ChatModeFlow';
import { DraftingFlowData } from './components/DraftingFlow';

type TabType = 'ingestion' | 'live' | 'chat' | 'drafting';

const ArchitecturePage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('ingestion');

    const flows = {
        ingestion: { 
            data: IngestionFlowData, 
            icon: <Database />, 
            label: "Ingestion Engine",
            status: "OPTIMIZED"
        },
        live: { 
            data: LiveModeFlowData, 
            icon: <Zap />, 
            label: "Voice Pipeline",
            status: "LOW_LATENCY"
        },
        chat: { 
            data: ChatModeFlowData, 
            icon: <MessageSquare />, 
            label: "RAG Assistant",
            status: "STREAMING"
        },
        drafting: { 
            data: DraftingFlowData, 
            icon: <FileText />, 
            label: "Drafting Lab",
            status: "PRECISION"
        },
    };

    const activeFlow = flows[activeTab];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30 font-sans overflow-x-hidden w-full">
            {/* Command Center Viewport */}
            <div className="h-screen flex flex-col relative overflow-hidden">
                {/* Tactical Header - Fixed at the top */}
                <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/40 backdrop-blur-xl border-b border-white/5 py-3 md:py-4 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-10">
                        <NextLink href="/" className="flex items-center gap-2 md:gap-3 group">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                                <Cpu className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs md:text-sm font-black text-white tracking-tighter uppercase leading-none">CivicPulse</span>
                                <span className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Command Center</span>
                            </div>
                        </NextLink>

                        {/* Breadcrumbs / Status - Hidden on tablet/mobile */}
                        <div className="hidden xl:flex items-center gap-4 py-1.5 px-4 bg-white/5 rounded-full border border-white/5">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                <LayoutGrid size={12} />
                                Systems
                            </div>
                            <div className="w-px h-3 bg-white/10" />
                            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                                {activeFlow.label}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden sm:flex items-center gap-4 md:gap-6 px-3 md:px-4 py-1.5 md:py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg md:rounded-xl">
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Load</span>
                                <span className="text-[10px] md:text-xs font-bold text-indigo-400 leading-none">NOMINAL</span>
                            </div>
                            <Activity className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 animate-pulse" />
                        </div>
                        <button 
                            onClick={() => {
                                const presentation = document.getElementById('presentation');
                                presentation?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/20 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-white transition-all uppercase tracking-widest shadow-lg shadow-indigo-600/20"
                        >
                            <Rocket className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden xs:inline">Launch</span>
                            <span className="hidden md:inline">Presentation</span>
                        </button>
                        <NextLink href="/" className="group flex items-center justify-center p-2 md:px-5 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-white transition-all uppercase tracking-widest text-slate-400 hover:text-white">
                            <span className="md:hidden">EXIT</span>
                            <span className="hidden md:inline">Exit Board</span>
                        </NextLink>
                    </div>
                </header>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                    {/* Navigation: Sidebar (MD+) or Bottom Nav (Mobile) */}
                    <div className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto w-full md:w-64 bg-slate-900/80 md:bg-slate-900 backdrop-blur-2xl md:backdrop-blur-none border-t md:border-t-0 md:border-r border-white/10 md:border-white/5 flex flex-row md:flex-col items-center md:items-stretch p-2 md:p-4 md:pt-24 z-50">
                        <h3 className="hidden md:block text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mb-6 px-4">
                            Operational Graphs
                        </h3>
                        <nav className="flex-1 flex md:flex-col justify-around md:justify-start gap-1 md:gap-2">
                            {(Object.keys(flows) as TabType[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 md:flex-none p-2 md:px-4 md:py-3.5 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center gap-1 md:gap-4 transition-all group ${
                                        activeTab === tab 
                                        ? 'bg-indigo-600 text-white shadow-lg md:shadow-xl shadow-indigo-900/40 scale-105 md:scale-100' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`${activeTab === tab ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                                        {React.cloneElement(flows[tab].icon as React.ReactElement, { size: 18 })}
                                    </div>
                                    <div className="flex flex-col items-center md:items-start truncate">
                                        <span className="text-[10px] md:text-sm font-bold truncate capitalize">{tab}</span>
                                        <span className={`hidden md:block text-[9px] font-black uppercase tracking-tighter ${activeTab === tab ? 'text-indigo-200' : 'text-slate-600'}`}>
                                            {flows[tab].status}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </nav>

                        <div className="mt-auto hidden md:block">
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20">
                                <Shield className="w-6 h-6 text-indigo-400 mb-3" />
                                <h4 className="text-xs font-bold text-white mb-1">Encrypted Access</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    All architectural flows are visualized via isolated secure nodes.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 relative pt-20 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-950">
                            <ArchitectureBoard 
                                initialNodes={activeFlow.data.nodes}
                                initialEdges={activeFlow.data.edges}
                                hoverContent={activeFlow.data.hoverContent}
                            />
                        </div>

                        {/* Hint Overlay (Mobile) */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none z-[40]">
                            <div className="flex flex-col items-center gap-2 text-slate-600 opacity-50">
                                <span className="text-[9px] font-bold uppercase tracking-widest">Scroll to Presentation</span>
                                <ChevronDown className="w-4 h-4 animate-bounce" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lower Viewport: Presentation */}
            <div id="presentation" className="scroll-mt-24 md:scroll-mt-32">
                <ArchitecturePresentation />
            </div>

            {/* Final Technical Footer */}
            <div className="py-20 md:py-32 bg-slate-950 flex flex-col items-center gap-8 border-t border-white/5 overflow-hidden w-full">
                <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 grayscale opacity-20 px-6">
                    <TechLabel name="AWS BEDROCK" />
                    <TechLabel name="NEXT.JS 15" />
                    <TechLabel name="FASTAPI" />
                    <TechLabel name="OPENSEARCH" />
                </div>
                <NextLink href="/" className="group flex flex-col items-center gap-4">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 rounded-2xl md:rounded-3xl flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-500 shadow-xl">
                        <Cpu className="w-6 h-6 md:w-8 md:h-8 text-slate-500 group-hover:text-white" />
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-slate-600 group-hover:text-white transition-colors tracking-[0.3em] md:tracking-[0.4em] uppercase">
                        Return to Dashboard
                    </span>
                </NextLink>
            </div>
        </div>
    );
};

const TechLabel = ({ name }: { name: string }) => (
    <span className="text-sm font-black text-white tracking-widest">{name}</span>
);

export default ArchitecturePage;
