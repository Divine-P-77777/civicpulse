import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, Scale, Heart, ExternalLink } from 'lucide-react';

const Footer = () => {
    return (
        <div className="px-4 pb-10 sm:px-6 lg:px-8 bg-slate-50 overflow-hidden">
            <footer className="bg-[#181d28] text-slate-300 pt-16 pb-28 md:pb-16 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl relative border border-white/5 overflow-hidden">
                {/* Subtle top glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />

                <div className="max-w-7xl mx-auto px-6 sm:px-12 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                        
                        {/* Brand Column */}
                        <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
                            <Link href="/" className="flex items-center gap-2.5 mb-5 group">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-2xl font-black text-white tracking-tight">CivicPulse</span>
                            </Link>

                            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
                                AI-powered legal rights assistant designed to make complex legal documents, contracts, and civic rights understandable and accessible for every citizen.
                            </p>

                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Trained on Indian Laws & Supreme Court Precedents</span>
                            </div>
                        </div>

                        {/* Navigation Links Columns */}
                        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-left">
                            
                            {/* Platform */}
                            <div>
                                <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 text-indigo-400">
                                    Platform
                                </h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li>
                                        <Link href="/live" className="hover:text-white transition-colors flex items-center gap-1.5">
                                            Live Assistant
                                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">Voice</span>
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/chat" className="hover:text-white transition-colors">
                                            Document Audit
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/draftcreation" className="hover:text-white transition-colors">
                                            Legal Letter & RTI
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Resources */}
                            <div>
                                <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 text-indigo-400">
                                    Knowledge
                                </h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li>
                                        <Link href="/architecture" className="hover:text-white transition-colors">
                                            System Architecture
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/admin" className="hover:text-white transition-colors">
                                            RAG Knowledge Base
                                        </Link>
                                    </li>
                                    <li>
                                        <a href="https://www.indiacode.nic.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                                            India Code <ExternalLink size={12} className="opacity-60" />
                                        </a>
                                    </li>
                                </ul>
                            </div>

                            {/* Trust & Legal */}
                            <div className="col-span-2 sm:col-span-1">
                                <h4 className="text-white font-bold text-xs uppercase tracking-widest mb-4 text-indigo-400">
                                    Trust & Legal
                                </h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li>
                                        <Link href="/terms" className="hover:text-white transition-colors">
                                            Terms of Service
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/privacy" className="hover:text-white transition-colors">
                                            Privacy Policy
                                        </Link>
                                    </li>
                                    <li>
                                        <span className="text-xs text-slate-500 block pt-1">
                                            End-to-End Encrypted
                                        </span>
                                    </li>
                                </ul>
                            </div>

                        </div>
                    </div>

                    {/* Bottom Metadata & Disclaimer */}
                    <div className="mt-14 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
                        <p>© 2026 CivicPulse. Built to empower citizens with legal awareness.</p>
                        
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] text-slate-400">Not formal legal representation</span>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">RAG Engine Online</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Subtle background glow blobs */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-500/5 blur-[90px] rounded-full pointer-events-none" />
            </footer>
        </div>
    );
};

export default Footer;
