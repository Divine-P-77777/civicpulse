'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function BrandLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-purple-300 via-white to-cyan-200">
      {/* Centered Logo */}
      <motion.div 
        className="mb-6 flex items-center justify-center"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </motion.div>
      
      {/* Brand Name */}
      <h1 className="text-[1.75rem] font-bold text-slate-900 mb-8 tracking-tight font-heading">
        CivicPulse
      </h1>

      {/* Indeterminate linear loading bar */}
      <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative shadow-inner">
        <motion.div
          className="absolute inset-y-0 left-0 bg-indigo-500 w-1/3 rounded-full shadow-md"
          animate={{
            x: ['-100%', '300%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}
