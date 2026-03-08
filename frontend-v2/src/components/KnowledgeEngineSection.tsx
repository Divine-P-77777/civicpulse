'use client';

import { motion } from 'motion/react';
import { Database, SearchCode, Braces } from 'lucide-react';

const steps = [
    {
        icon: SearchCode,
        iconBg: 'bg-white/10',
        iconColor: 'text-white/80',
        title: '01. Data Crawling',
        desc: 'We continuously scrape and aggregate public legal records, verified statutes, and case law from trusted repositories to build our foundational knowledge.',
    },
    {
        icon: Braces,
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        title: '02. Semantic Embedding',
        desc: 'Raw data is chunked and translated into high-dimensional embeddings using frontier AI document models, capturing semantic intent and nuance.',
    },
    {
        icon: Database,
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        title: '03. Supabase Vector DB',
        desc: 'Embeddings are indexed in millions of dense vectors into Supabase. High-speed similarity search yields exact citations (RAG) at production-grade latency.',
    },
];

export default function KnowledgeEngineSection() {
    return (
        <section className="py-28 bg-[#0a0a0a] text-white relative w-full overflow-hidden">
            {/* Abstract dark gradients */}
            <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-900/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="section-container relative z-10">
                {/* ── Header ──────────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16 border-b border-white/10 pb-8">
                    <div className="max-w-xl">
                        <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-blue-400 mb-3 block">
                            Architecture
                        </span>
                        <h2 className="text-[32px] md:text-[44px] font-semibold tracking-tight text-white leading-tight">
                            The Knowledge Engine
                        </h2>
                    </div>
                    <p className="text-[15px] text-white/50 max-w-sm leading-relaxed">
                        Under the hood, we use enterprise-grade indexing and vector search to ensure responses are accurate and legally verified.
                    </p>
                </div>

                {/* ── Steps ───────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {steps.map((step, idx) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ delay: idx * 0.12, duration: 0.6 }}
                            className="p-8 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
                        >
                            <div className={`w-12 h-12 rounded-xl ${step.iconBg} flex items-center justify-center mb-6 ${step.iconColor}`}>
                                <step.icon size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[18px] font-medium text-white mb-3">
                                {step.title}
                            </h3>
                            <p className="text-[14px] leading-relaxed text-white/45">
                                {step.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
