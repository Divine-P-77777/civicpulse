'use client';

import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.15,
            duration: 0.7,
            ease: [0.25, 0.46, 0.45, 0.94],
        },
    }),
};

export default function HeroSection() {
    const { t } = useTranslation();

    return (
        <section className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center">
            {/* ── Background video ───────────────────────────────────────── */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleY(-1)' }}
                >
                    <source
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
                        type="video/mp4"
                    />
                </video>
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(to bottom, rgba(255,255,255,0) 26.416%, white 66.943%)',
                    }}
                />
            </div>

            {/* ── Hero content ───────────────────────────────────────────── */}
            <div className="section-container relative z-10 flex flex-col items-center text-center gap-7 pt-40 pb-24">
                {/* Badge */}
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[12px] font-medium tracking-wide text-[#555] border border-[#e5e5e5] bg-white/80 backdrop-blur-sm shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                        India&apos;s AI Legal Platform
                    </span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    custom={1}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="leading-[1.08] tracking-[-0.04em] max-w-[900px]"
                    style={{
                        fontWeight: 500,
                        fontSize: 'clamp(40px, 5.5vw, 72px)',
                    }}
                >
                    {t('hero_headline')}
                </motion.h1>

                {/* Description */}
                <motion.p
                    custom={2}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="text-[17px] leading-[1.7] text-[#555] max-w-[600px]"
                >
                    {t('hero_subheading')}
                </motion.p>

                {/* CTA Button */}
                <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-2">
                    <button
                        className="px-9 py-4 text-[15px] font-medium text-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                        style={{
                            borderRadius: '100px',
                            background: 'linear-gradient(135deg, #2d2d2d 0%, #111 50%, #1a1a1a 100%)',
                            boxShadow:
                                'inset -4px -6px 25px 0px rgba(201,201,201,0.08), inset 4px 4px 10px 0px rgba(29,29,29,0.24), 0 10px 30px -10px rgba(0,0,0,0.5)',
                        }}
                    >
                        {t('experience_civicpulse')}
                    </button>
                </motion.div>
            </div>
        </section>
    );
}
