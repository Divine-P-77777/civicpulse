"use client"
import React, { useState } from 'react';
import NextLink from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import ArchitectureBoard from './components/ArchitectureBoard';
import ArchitecturePresentation from './components/ArchitecturePresentation';
import OperationalGraphs from './components/OperationalGraphs';

import { IngestionFlowData } from './components/IngestionFlow';
import { LiveModeFlowData } from './components/LiveModeFlow';
import { ChatModeFlowData } from './components/ChatModeFlow';
import { DraftingFlowData } from './components/DraftingFlow';

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
    Rocket,
    ChevronLeft,
    PanelLeftClose,
    PanelLeftOpen,
    Presentation
} from 'lucide-react';

type TabType = 'ingestion' | 'live' | 'chat' | 'drafting';

const ArchitecturePage = () => {
    const [activeTab, setActiveTab] = useState<TabType>('ingestion');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-indigo-500/30 font-sans overflow-x-hidden w-full transition-all duration-500">
            {/* Command Center Viewport */}
            <div className="h-screen flex flex-col relative overflow-hidden">
                {/* Tactical Header - Fixed at the top */}
                <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-950/40 backdrop-blur-xl border-b border-white/5 py-3 md:py-4 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-10">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-indigo-400 transition-all active:scale-95"
                                title={isSidebarOpen ? "Collapse Control Center" : "Expand Control Center"}
                            >
                                {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                            </button>
                            <NextLink href="/" className="flex items-center gap-2 md:gap-3 group">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                                    <Cpu className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs md:text-sm font-black text-white tracking-tighter uppercase leading-none">CivicPulse</span>
                                    <span className="text-[8px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">Command Center</span>
                                </div>
                            </NextLink>
                        </div>

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
                            <Presentation className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden xs:inline">Mode</span>
                            <span className="hidden md:inline">Presentation</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                    {/* Navigation: Sidebar (MD+) or Bottom Nav (Mobile) */}
                    <motion.div 
                        initial={false}
                        animate={{ 
                            width: isSidebarOpen ? (window.innerWidth < 768 ? '100%' : '320px') : '0px',
                            x: isSidebarOpen ? 0 : -320,
                            opacity: isSidebarOpen ? 1 : 0
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto bg-slate-900/80 md:bg-slate-900 backdrop-blur-2xl md:backdrop-blur-none border-t md:border-t-0 md:border-r border-white/10 md:border-white/5 flex flex-row md:flex-col items-center md:items-stretch p-2 md:p-6 md:pt-24 z-50 h-[80px] md:h-auto overflow-hidden"
                    >
                        <h3 className="hidden md:block text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 px-2">
                            Deployment Selection
                        </h3>
                        <nav className="flex-1 flex md:flex-col justify-around md:justify-start gap-1 md:gap-1.5 scrollbar-hide overflow-x-auto md:overflow-x-visible">
                            {(Object.keys(flows) as TabType[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 md:flex-none p-2 md:px-4 md:py-3.5 rounded-xl md:rounded-2xl flex flex-col md:flex-row items-center gap-1 md:gap-4 transition-all group ${
                                        activeTab === tab 
                                        ? 'bg-indigo-600 text-white shadow-lg md:shadow-xl shadow-indigo-900/40' 
                                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <div className={`${activeTab === tab ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`}>
                                        {React.cloneElement(flows[tab].icon as React.ReactElement, { size: 18 })}
                                    </div>
                                    <div className="flex flex-col items-center md:items-start truncate">
                                        <span className="text-[9px] md:text-xs font-black truncate uppercase tracking-tight">{tab} ENGINE</span>
                                        <span className={`hidden md:block text-[8px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-indigo-200' : 'text-slate-600'}`}>
                                            {flows[tab].status}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </nav>

                        {/* Operational Graphs Integration */}
                        <div className="hidden md:block mt-8 pt-8 border-t border-white/5">
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6 px-2">
                                Operational Status
                            </h3>
                            <OperationalGraphs />
                        </div>

                        <div className="mt-auto hidden md:block pt-8">
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600/5 to-purple-600/5 border border-white/5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Shield className="w-5 h-5 text-indigo-500/50" />
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Isolated System</h4>
                                </div>
                                <p className="text-[9px] text-slate-500 leading-relaxed font-medium">
                                    Multi-tenant encryption active. All architectural vectors are mathematically isolated.
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 relative pt-20 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-950">
                            <ArchitectureBoard 
                                flowId={activeTab}
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
