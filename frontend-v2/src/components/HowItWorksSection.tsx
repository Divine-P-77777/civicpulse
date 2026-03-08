'use client';

import { motion } from 'motion/react';
import { UploadCloud, Search, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const steps = [
    {
        icon: UploadCloud,
        title: 'Upload',
        desc: 'Securely upload your legal agreements, notices, or contracts in seconds.',
    },
    {
        icon: Search,
        title: 'Analyze',
        desc: 'Our Law-Verified AI scans for compliance risks and hidden clauses.',
    },
    {
        icon: CheckCircle,
        title: 'Take Action',
        desc: 'Generate counter-letters or consult with verified professionals instantly.',
    },
];

export default function HowItWorksSection() {
    const { t } = useTranslation();

    return (
        <section id="how-it-works" className="py-28 bg-[#fafafa] relative w-full overflow-hidden border-t border-gray-100">
            <div className="section-container">
                <div className="flex flex-col items-center text-center mb-16">
                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-blue-600 mb-4">
                        Process
                    </span>
                    <h2 className="text-[32px] md:text-[40px] font-semibold tracking-tight text-[#1a1a1a] mb-4">
                        {t('how_it_works')}
                    </h2>
                    <p className="text-[16px] text-[#666] max-w-[480px] leading-relaxed">
                        Three simple steps to decode complexity and safeguard your rights.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line */}
                    <div className="hidden md:block absolute top-[44px] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent z-0" />

                    {steps.map((step, idx) => (
                        <motion.div
                            key={step.title}
                            initial={{ opacity: 0, y: 24 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-80px' }}
                            transition={{ delay: idx * 0.15, duration: 0.6 }}
                            className="relative z-10 flex flex-col items-center text-center group"
                        >
                            <div className="w-[88px] h-[88px] rounded-full bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex items-center justify-center mb-7 group-hover:scale-105 transition-transform duration-300">
                                <step.icon size={32} className="text-blue-600" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">
                                {step.title}
                            </h3>
                            <p className="text-[14px] text-[#666] leading-relaxed max-w-[260px]">
                                {step.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
