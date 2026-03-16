"use client"
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, Database, Scale, Users, Cpu, Code2, Layers, HardDrive } from 'lucide-react';

const SLIDES = [
    {
        title: "The Manifest",
        subtitle: "Architectural Integrity",
        content: "CivicPulse is built on a foundation of cryptographic security and verifiable intelligence. We move fast, but our safety protocols are immutable.",
        icon: <Shield className="w-12 h-12 text-indigo-400" />,
        color: "from-indigo-500/10 to-transparent"
    },
    {
        title: "Neural Pipeline",
        subtitle: "RAG & LLM Synergy",
        content: "Context-aware retrieval isn't just a feature; it's our core. Using Bedrock and OpenSearch, we ground every hallucination-free response in law.",
        icon: <Cpu className="w-12 h-12 text-emerald-400" />,
        color: "from-emerald-500/10 to-transparent"
    },
    {
        title: "Elastic Core",
        subtitle: "AWS Serverless Backbone",
        content: "From S3 archives to DynamoDB state tracking, our infrastructure is globally distributed and infinitely scalable. Zero downtime, zero friction.",
        icon: <HardDrive className="w-12 h-12 text-blue-400" />,
        color: "from-blue-500/10 to-transparent"
    },
    {
        title: "Citizen Focus",
        subtitle: "Human-Centric AI",
        content: "At the end of every pipeline is a person. Our low-latency voice and chat interfaces ensure that justice is accessible to all, instantly.",
        icon: <Layers className="w-12 h-12 text-purple-400" />,
        color: "from-purple-500/10 to-transparent"
    }
];

const ArchitecturePresentation = () => {
    return (
        <section className="bg-slate-950 py-24 md:py-48 px-4 sm:px-12 border-t border-white/5 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16 md:mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 className="text-[10px] md:text-xs font-black text-indigo-500 uppercase tracking-[0.4em] md:tracking-[0.6em] mb-4">
                            System Manifest
                        </h2>
                        <h1 className="text-2xl sm:text-5xl md:text-7xl font-black text-white tracking-tight sm:tracking-tighter max-w-4xl mx-auto leading-[1.2] md:leading-[0.9] break-words">
                            BUILDING THE FUTURE OF <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500 uppercase">Digital Justice</span>
                        </h1>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    {SLIDES.map((slide, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className={`p-8 md:p-16 bg-slate-950 flex flex-col items-start gap-6 md:gap-8 group hover:bg-white/[0.02] transition-all duration-700`}
                        >
                            <div className="p-4 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 group-hover:scale-110 group-hover:border-indigo-500/30 transition-all duration-500">
                                {slide.icon}
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                                    {slide.subtitle}
                                </h4>
                                <h3 className="text-3xl font-black text-white mb-6 tracking-tight">
                                    {slide.title}
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
                                    {slide.content}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
                
                {/* Tech Grid */}
                <div className="mt-24 md:mt-48">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-12 items-center opacity-30">
                        <TechBadge name="AWS BEDROCK" />
                        <TechBadge name="CLAUDE-3" />
                        <TechBadge name="NEXT.JS 15" />
                        <TechBadge name="FASTAPI" />
                        <TechBadge name="REDUX" />
                        <TechBadge name="CLERK" />
                    </div>
                </div>

                <div className="mt-48 text-center">
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
                        <Code2 size={16} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                            Production Ready Architecture v2.4.0
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

const TechBadge = ({ name }: { name: string }) => (
    <div className="flex flex-col items-center">
        <span className="text-[10px] font-black text-white tracking-[0.2em] whitespace-nowrap hover:text-indigo-400 transition-colors cursor-default">
            {name}
        </span>
    </div>
);

export default ArchitecturePresentation;
