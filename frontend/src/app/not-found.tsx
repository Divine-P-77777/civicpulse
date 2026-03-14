import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import React from 'react';

export default function NotFound() {
  return (
    <main className="min-h-screen py-20 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 relative overflow-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl mx-auto">

        {/* Animated illustrative image */}
        <div className="w-48 h-48 mb-6 ">
          <img
            src="/not-found.gif"
            alt="Page not found illustration"
            className="w-full h-full object-cover"
          />
        </div>

        {/* 404 Text */}
        <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 tracking-tighter mb-4 font-heading select-none drop-shadow-sm">
          404
        </h1>

        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 font-heading tracking-tight">
          Looks like you're lost
        </h2>

        <p className="text-lg text-slate-600 mb-10 font-sans leading-relaxed">
          The page you are looking for doesn't exist, has been moved, or you don't have access to it. Let's get you back on track.
        </p>

        {/* Action button */}
        <Link
          href="/"
          className="group flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.3)] transition-all transform hover:scale-105 active:scale-95 text-lg"
        >
          <Home size={20} className="group-hover:-translate-y-0.5 transition-transform" />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
