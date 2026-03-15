import React from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

const Footer = () => {
    return (
        <div className="px-4 pb-12 sm:px-6 lg:px-8 bg-slate-50 overflow-hidden">
            <footer className="bg-[#1e2330] text-slate-300 pt-16 rounded-t-[3rem] md:rounded-[4rem] shadow-2xl relative border border-white/5 pb-56 md:pb-24 overflow-hidden">
                {/* Subtle top glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
                
                <div className="max-w-7xl mx-auto px-8 sm:px-12">
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-12 lg:gap-16">
                        {/* Brand Section */}
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                            <Link href="/" className="flex items-center gap-2 mb-6 group">
                                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-2xl font-black text-white tracking-tighter">CivicPulse</span>
                            </Link>
                            <p className="text-slate-400 max-w-sm text-sm leading-relaxed hidden sm:block">
                                Bridging the gap between law and citizenry through the power of advanced AI.
                            </p>
                        </div>
                        
                        {/* Links Sections - Compact Mobile */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-10 sm:gap-x-12 w-full lg:w-auto text-center sm:text-left">
                            <div className="flex flex-col gap-3">
                                <h4 className="text-white font-bold text-[10px] uppercase tracking-[0.25em] opacity-50">Platform</h4>
                                <ul className="space-y-2.5 text-sm text-slate-400">
                                    <li><Link href="/live" className="hover:text-white transition-colors">Live Mode</Link></li>
                                    <li><Link href="/chat" className="hover:text-white transition-colors">Chat Interface</Link></li>
                                    <li><Link href="/draftcreation" className="hover:text-white transition-colors">Legal Drafting</Link></li>
                                </ul>
                            </div>

                            <div className="flex flex-col gap-3">
                                <h4 className="text-white font-bold text-[10px] uppercase tracking-[0.25em] opacity-50">Resources</h4>
                                <ul className="space-y-2.5 text-sm text-slate-400">
                                    <li><Link href="/admin" className="hover:text-white transition-colors">Dashboard</Link></li>
                                    <li><Link href="/settings" className="hover:text-white transition-colors">Settings</Link></li>
                                    <li><Link href="#" className="hover:text-white transition-colors">Help Center</Link></li>
                                </ul>
                            </div>

                            <div className="col-span-1 sm:col-span-2 md:col-span-1 flex flex-col gap-3 pt-6 sm:pt-0 border-t border-white/5 sm:border-none">
                                <h4 className="text-white font-bold text-[10px] uppercase tracking-[0.25em] opacity-50">Legal</h4>
                                <div className="flex flex-wrap justify-center sm:justify-start md:flex-col gap-4 sm:gap-6 md:gap-3 text-xs text-slate-400">
                                    <Link href="/terms" className="hover:text-white transition-colors uppercase tracking-widest">Terms</Link>
                                    <Link href="/privacy" className="hover:text-white transition-colors uppercase tracking-widest">Privacy</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom Metadata */}
                    <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                            © 2026 CivicPulse. All rights reserved.
                        </p>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[9px] uppercase tracking-[0.2em] text-slate-600 font-bold">System Online</span>
                        </div>
                    </div>

                    {/* Branding text - Hidden on Mobile for clean overlap */}
                    <div className="mt-16 w-full hidden sm:flex justify-center opacity-[0.02] pointer-events-none select-none">
                        <span className="text-[4rem] sm:text-[6rem] lg:text-[10rem] leading-none font-black tracking-tighter text-white">
                            CivicPulse
                        </span>
                    </div>
                </div>
                
                {/* Decorative background shapes */}
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-500/5 blur-[80px] rounded-full pointer-events-none" />
            </footer>
        </div>
    );
};

export default Footer;
