'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Mic, FileText, User } from 'lucide-react';
import { useAppDispatch } from '@/hooks/redux';
import { setCurrentMode } from '@/store/slices/uiSlice';

export default function MobileFooter() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // Hide the footer on specific routes where it interferes with the UI
  if (pathname === '/live' || pathname === '/chat') {
    return null;
  }

  const navItems = [
    { name: 'Home', href: '/', icon: Home, highlight: false },
    { name: 'Docs', href: '/documents', icon: FileText, highlight: false },
    { name: 'Live', href: '/live', icon: Mic, highlight: true }, // The big center button
    { name: 'Chat', href: '/chat', icon: MessageCircle, highlight: false },
    { name: 'Profile', href: '/settings', icon: User, highlight: false },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed footer */}
      <div className="h-20 lg:hidden w-full pb-safe" />

      {/* Actual Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden pb-safe">
        <nav className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            // Highlighted center button logic (e.g., the 'Live' action)
            if (item.highlight) {
              return (
                <div key={item.name} className="relative -top-5 flex flex-col items-center">
                  <Link
                    href={item.href}
                    onClick={() => dispatch(setCurrentMode('live'))}
                    className="flex flex-col items-center justify-center bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg border-4 border-slate-50 relative animate-pulse hover:bg-indigo-700 hover:scale-105 transition-all"
                  >
                    <Icon size={24} />
                    <span className="sr-only">{item.name}</span>
                  </Link>
                </div>
              );
            }

            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                  if (item.href === '/') dispatch(setCurrentMode('home'));
                }}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-full transition-all ${isActive ? 'bg-indigo-50' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
