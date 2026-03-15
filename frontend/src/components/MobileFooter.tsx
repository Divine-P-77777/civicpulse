'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Mic, PenTool, User } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function MobileFooter() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // Hide the footer on specific routes where it interferes with the UI
  if (pathname.startsWith('/chat') || pathname.startsWith('/live') || pathname.startsWith('/draftcreation')) {
    return null;
  }

  const navItems = [
    { name: 'Home', href: '/', icon: Home, highlight: false },
    { name: 'Chat', href: '/chat', icon: MessageCircle, highlight: false },
    { name: 'Live', href: '/live', icon: Mic, highlight: true }, // The big center button
    { name: 'Draft', href: '/draftcreation', icon: PenTool, highlight: false },
    { name: 'Account', href: '/admin', icon: User, highlight: false, isProfile: true },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed footer */}
      <div className="h-24 lg:hidden w-full pb-safe" />

      {/* Actual Fixed Footer */}
      <div className="fixed bottom-6 left-4 right-4 z-[99] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.15)] lg:hidden rounded-[2rem] overflow-visible">
        <nav className="flex justify-around items-center h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Highlighted center button logic
            if (item.highlight) {
              return (
                <div key={item.name} className="relative -top-3">
                  <Link
                    href={item.href}
                    onClick={() => dispatch(setCurrentMode('live'))}
                    className="flex items-center justify-center bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg shadow-indigo-200 border-4 border-white active:scale-95 transition-all"
                  >
                    <Icon size={24} />
                  </Link>
                </div>
              );
            }

            const isActive = pathname === item.href;

            // Profile / Admin Item Logic
            if (item.isProfile) {
              return (
                <div key={item.name} className="flex flex-col items-center justify-center flex-1 h-full py-1">
                  <SignedIn>
                    <div className="p-0.5 rounded-full border-2 border-slate-100 hover:border-indigo-200 transition-colors">
                      <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-7 h-7' } }} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">Profile</span>
                  </SignedIn>
                  <SignedOut>
                    <Link
                      href={item.href}
                      className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-400 hover:text-indigo-600 transition-all"
                    >
                      <Icon size={20} />
                      <span className="text-[9px] font-bold uppercase">Login</span>
                    </Link>
                  </SignedOut>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                  if (item.href === '/') dispatch(setCurrentMode('home'));
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'
                  }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] uppercase tracking-tighter ${isActive ? 'font-black' : 'font-bold'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
