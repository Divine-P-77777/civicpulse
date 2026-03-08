'use client';

import { motion } from 'motion/react';

const footerLinks = {
    Product: ['Features', 'Integrations', 'Changelog', 'Roadmap', 'Pricing'],
    Company: ['About us', 'Blog', 'Careers', 'Press', 'Terms of service', 'Privacy Policy'],
    Resources: ['Documentation', 'API Reference', 'Help Center', 'Status', 'Community'],
    Socials: ['LinkedIn', 'Twitter / X', 'Discord', 'YouTube', 'GitHub'],
};

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
    }),
};

export default function FooterSection() {
    return (
        <footer id="contact" className="relative w-full overflow-hidden bg-white">
            <div className="relative">
                {/* ── Content grid ─────────────────────────────────────────── */}
                <div className="section-container relative z-10 pt-24 pb-14">
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-12">
                        {/* Brand column */}
                        <motion.div
                            custom={0}
                            variants={fadeUp}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="flex flex-col gap-6"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" fill="none" />
                                    </svg>
                                </div>
                                <span className="text-[16px] font-bold tracking-tight text-[#1a1a1a]">
                                    CivicPulse
                                </span>
                            </div>

                            <p className="text-[14px] text-[#666] leading-[1.7] max-w-[240px]">
                                Simple, powerful management for remote teams who want to move fast without losing clarity.
                            </p>

                            {/* Badges */}
                            <div className="flex items-center gap-3 flex-wrap">
                                {[
                                    { label: 'ISO 27001', sub: 'CERTIFIED' },
                                    { label: 'SOC 2', sub: 'TYPE II' },
                                ].map(({ label, sub }) => (
                                    <div
                                        key={label}
                                        className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-[#e0e0e0] gap-0.5"
                                    >
                                        <span className="text-[8px] font-bold text-[#1a1a1a] leading-tight text-center">
                                            {label}
                                        </span>
                                        <span className="text-[7px] text-[#888] leading-tight tracking-wider">
                                            {sub}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Link columns */}
                        {Object.entries(footerLinks).map(([title, links], colIdx) => (
                            <motion.div
                                key={title}
                                custom={colIdx + 1}
                                variants={fadeUp}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                className="flex flex-col gap-4"
                            >
                                <h4 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#aaa]">
                                    {title}
                                </h4>
                                <ul className="flex flex-col gap-3">
                                    {links.map((link, i) => (
                                        <li key={link}>
                                            <a
                                                href="#"
                                                className="group flex items-center gap-1 text-[14px] text-[#555] hover:text-[#1a1a1a] transition-colors duration-200"
                                            >
                                                {link}
                                                {i === 1 && (
                                                    <span className="text-blue-500 text-[11px] font-medium ml-1">↗</span>
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ── Giant CivicPulse brand text ──────────────────────────── */}
                <div className="section-container relative z-10 pt-8 pb-0 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="relative select-none"
                    >
                        <h2
                            className="leading-none tracking-[-0.04em] text-transparent bg-clip-text"
                            style={{
                                fontWeight: 700,
                                fontSize: 'clamp(72px, 12vw, 180px)',
                                backgroundImage:
                                    'linear-gradient(180deg, #d0d0d0 0%, #e8e8e8 40%, rgba(240,240,240,0.3) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Civic
                            <span
                                style={{
                                    fontFamily: 'var(--font-instrument)',
                                    fontStyle: 'italic',
                                    fontWeight: 400,
                                    backgroundImage:
                                        'linear-gradient(180deg, #b8b8b8 0%, #d4d4d4 40%, rgba(224,224,224,0.3) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Pulse
                            </span>
                        </h2>
                    </motion.div>
                </div>

                {/* ── Gradient blob ────────────────────────────────────────── */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-[420px] pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(180,195,230,0.45) 0%, rgba(220,200,180,0.35) 40%, transparent 70%)',
                        zIndex: 0,
                    }}
                />

                {/* ── Bottom bar ──────────────────────────────────────────── */}
                <div className="relative z-10 border-t border-[#eee]">
                    <div className="section-container py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[13px] text-[#999]">
                            Copyright CivicPulse © 2026
                        </p>
                        <p className="text-[13px] text-[#999]">
                            All rights reserved. Built for teams worldwide.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
