import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface LiveBackgroundProps {
    status?: string;
}

// Status-aware color palettes for the Living Canvas
const STATUS_PALETTES: Record<string, string[]> = {
    idle:       ['bg-slate-200/25', 'bg-gray-200/20', 'bg-blue-100/15', 'bg-indigo-100/10'],
    listening:  ['bg-blue-300/30',  'bg-cyan-200/25', 'bg-sky-200/20',  'bg-indigo-200/15'],
    processing: ['bg-amber-200/25', 'bg-yellow-200/20', 'bg-orange-100/20', 'bg-rose-100/15'],
    speaking:   ['bg-emerald-300/30', 'bg-teal-200/25', 'bg-green-200/20', 'bg-cyan-100/15'],
    uploading:  ['bg-violet-200/25', 'bg-blue-200/20', 'bg-indigo-200/20', 'bg-purple-100/15'],
    error:      ['bg-red-200/25', 'bg-rose-200/20', 'bg-pink-100/15', 'bg-orange-100/10'],
};

// Fixed bloom positions & durations (don't change per status)
const BLOOM_CONFIG = [
    { initial: { x: -100, y: -100 }, animate: { x: 100, y: 100 },   duration: 25 },
    { initial: { x: 150,  y: -50  }, animate: { x: -150, y: 150 },  duration: 20 },
    { initial: { x: -50,  y: 150  }, animate: { x: 150, y: -150 },  duration: 22 },
    { initial: { x: 0,    y: 0    }, animate: { x: 50,  y: 50 },    duration: 18 },
];

export const LiveBackground: React.FC<LiveBackgroundProps> = ({ status = 'idle' }) => {
    const colors = STATUS_PALETTES[status] || STATUS_PALETTES.idle;

    // Opacity shifts based on state — more vivid when active
    const containerOpacity = useMemo(() => {
        if (status === 'listening') return 'opacity-70';
        if (status === 'speaking') return 'opacity-75';
        if (status === 'processing') return 'opacity-60';
        return 'opacity-50';
    }, [status]);

    return (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none z-0 transition-opacity duration-1000 ${containerOpacity}`}>
            {BLOOM_CONFIG.map((bloom, i) => (
                <motion.div
                    key={i}
                    initial={bloom.initial}
                    animate={bloom.animate}
                    transition={{ duration: bloom.duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
                    className={`absolute w-[600px] h-[600px] rounded-full blur-[120px] transition-colors duration-1000 ${colors[i]}`}
                />
            ))}
        </div>
    );
};
