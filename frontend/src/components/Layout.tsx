'use client';

import Navigation from './Navigation';
import { useAppSelector } from '@/hooks/redux';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Full screen layout for Live Mode on mobile
  const isLiveMode = pathname === '/live';

  if (isLiveMode && isMobile) {
    return (
      <div className="h-screen bg-black overflow-hidden relative">
        {/* Mobile navigation button for Live Mode */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/50 backdrop-blur-sm text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation />
      
      <main className={`
        flex-1 overflow-auto transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'lg:ml-0' : 'lg:ml-0'}
      `}>
        {children}
      </main>
    </div>
  );
}