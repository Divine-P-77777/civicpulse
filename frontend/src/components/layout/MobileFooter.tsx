'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Mic, PenTool, User, Sparkles } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';
import { UserButton, useUser, SignInButton } from '@clerk/nextjs';

export default function MobileFooter() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isLoaded, isSignedIn } = useUser();

  // Hide the footer on specific full-screen immersive routes
  if (pathname.startsWith('/chat') || pathname.startsWith('/live') || pathname.startsWith('/draftcreation')) {
    return null;
  }

  const navItems = [
    { name: 'Home', href: '/', icon: Home, highlight: false },
    { name: 'Chat', href: '/chat', icon: MessageCircle, highlight: false },
    { name: 'Live', href: '/live', icon: Mic, highlight: true }, // Elevated center action button
    { name: 'Draft', href: '/draftcreation', icon: PenTool, highlight: false },
    { name: 'Account', href: '/admin', icon: User, highlight: false, isProfile: true },
  ];

  return (
    <>
      {/* Spacer to prevent content from being obscured behind fixed dock */}
      <div className="h-28 lg:hidden w-full" />

      {/* Modern Floating Bottom Dock */}
      <div className="fixed bottom-5 left-3 right-3 sm:left-6 sm:right-6 z-[99] lg:hidden select-none">
        <div className="mx-auto max-w-md bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-[0_16px_50px_rgba(15,23,42,0.18)] rounded-[2.2rem] px-2 py-1.5 transition-all">
          <nav className="flex justify-around items-center h-15 relative">
            {navItems.map((item) => {
              const Icon = item.icon;

              // Elevated Center "Live" Action Button
              if (item.highlight) {
                const isLiveActive = pathname === '/live';
                return (
                  <div key={item.name} className="relative -top-5 flex flex-col items-center">
                    <Link
                      href={item.href}
                      onClick={() => dispatch(setCurrentMode('live'))}
                      className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-600 to-violet-500 text-white shadow-[0_10px_30px_rgba(79,70,229,0.4)] border-4 border-white active:scale-95 transition-transform"
                      aria-label="Launch Live Voice and Camera Mode"
                    >
                      <Icon size={24} className="group-hover:scale-110 transition-transform" />
                      {/* Pulsing Live indicator */}
                      <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                      </span>
                    </Link>
                    <span className="text-[10px] font-extrabold text-indigo-600 mt-0.5 tracking-tight">
                      Live
                    </span>
                  </div>
                );
              }

              const isActive = pathname === item.href;

              // Profile / Account Item
              if (item.isProfile) {
                return (
                  <div key={item.name} className="flex flex-col items-center justify-center flex-1 h-full py-1">
                    {isLoaded && isSignedIn ? (
                      <div className="flex flex-col items-center justify-center space-y-0.5">
                        <div className="p-0.5 rounded-full border-2 border-indigo-200 hover:border-indigo-500 transition-colors">
                          <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-6 h-6' } }} />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 tracking-tight">Profile</span>
                      </div>
                    ) : (
                      <Link
                        href="/admin"
                        className="flex flex-col items-center justify-center w-full h-full space-y-0.5 text-slate-400 hover:text-indigo-600 active:scale-95 transition-all"
                      >
                        <div className="p-1 rounded-xl text-slate-500">
                          <Icon size={19} />
                        </div>
                        <span className="text-[10px] font-semibold tracking-tight">Login</span>
                      </Link>
                    )}
                  </div>
                );
              }

              // Standard Nav Links (Home, Chat, Draft)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                    else if (item.href === '/') dispatch(setCurrentMode('home'));
                    else dispatch(setCurrentMode('home'));
                  }}
                  className={`flex flex-col items-center justify-center flex-1 h-full space-y-0.5 transition-all active:scale-95 ${
                    isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all ${
                      isActive ? 'bg-indigo-50 text-indigo-600 scale-105' : 'text-slate-400'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] tracking-tight ${isActive ? 'font-extrabold text-indigo-600' : 'font-medium text-slate-500'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
