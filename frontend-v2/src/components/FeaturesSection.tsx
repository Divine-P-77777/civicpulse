'use client';

import { motion } from 'motion/react';
import {
    Radio,
    MessageCircle,
    AlertTriangle,
    Scale,
    FileText,
    Globe2,
    Lock,
    XCircle,
    CheckCircle2
} from 'lucide-react';

const features = [
    { icon: Radio, title: 'Live Mode', desc: 'Real-time guidance during legal conversations.' },
    { icon: MessageCircle, title: 'Chat Mode', desc: 'Interactive AI support for complex queries.' },
    { icon: AlertTriangle, title: 'Risk Detection', desc: 'Instantly flag hidden clauses and potential liabilities.' },
    { icon: Scale, title: 'Law-Verified AI (RAG)', desc: 'Responses grounded in verified legal frameworks.' },
    { icon: FileText, title: 'Letter Generator', desc: 'Auto-generate formal counter-notices and letters of intent.' },
    { icon: Globe2, title: 'Regional Languages', desc: 'Accessible support translated to native languages.' },
    { icon: Lock, title: 'Secure Storage', desc: 'Enterprise-grade encryption for all sensitive files.' },
];

export default function FeaturesSection() {
    return (
        <section className="py-28 bg-white relative w-full overflow-hidden">
            <div className="section-container">

                {/* ── Section Header ──────────────────────────────────────── */}
                <div className="flex flex-col items-center text-center mb-16">
                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-blue-600 mb-4">
                        Core Capabilities
                    </span>
                    <h2 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-[#1a1a1a] mb-4">
                        Everything you need. Nothing you don&apos;t.
                    </h2>
                </div>

                {/* ── Features Grid (7 cards → 3-col centered) ────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-28">
                    {features.map((feature, idx) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ delay: idx * 0.08, duration: 0.5 }}
                            className="group p-7 rounded-2xl border border-gray-100 bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300"
                        >
                            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-5 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon size={22} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-[14px] leading-relaxed text-[#777]">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* ── Comparison (Traditional vs CivicPulse) ──────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.7 }}
                    className="grid grid-cols-1 lg:grid-cols-2 border border-gray-100 rounded-3xl overflow-hidden shadow-sm"
                >
                    {/* Traditional Way */}
                    <div className="p-10 lg:p-14 bg-[#fafafa]">
                        <h3 className="text-[22px] font-semibold text-gray-400 mb-8">
                            Traditional Legal
                        </h3>
                        <ul className="flex flex-col gap-5">
                            {[
                                'High consultation fees by the hour',
                                'Days or weeks to get basic reviews',
                                'Complex jargon that hides risks',
                                'Only accessible in English primarily'
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-[15px] text-gray-500">
                                    <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CivicPulse Way */}
                    <div className="p-10 lg:p-14 bg-blue-600 relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-white opacity-[0.06] blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2" />
                        <h3 className="text-[24px] font-semibold text-white mb-8 relative z-10">
                            The CivicPulse Edge
                        </h3>
                        <ul className="flex flex-col gap-5 relative z-10">
                            {[
                                'Instant analysis at a fraction of the cost',
                                'Identify risks and loopholes in seconds',
                                'Plain language explanations anyone can grasp',
                                'Full multi-lingual support system'
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-[15px] text-white/90">
                                    <CheckCircle2 size={20} className="text-emerald-300 shrink-0 mt-0.5" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
