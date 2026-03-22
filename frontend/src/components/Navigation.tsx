'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { toggleSidebar, setCurrentMode } from '@/store/slices/uiSlice';
import { UserButton, SignInButton, SignUpButton, SignOutButton, useUser, useClerk } from '@clerk/nextjs';
import { NativeStartNow } from '@/components/ui/native-start-now';
import { UserRoundCogIcon } from '@/components/ui/UserRoundCogIcon';
import { MessageCircleIcon } from '@/components/ui/MessageCircleIcon';
import {
  Menu,
  X,
  Home,
  MessageCircle,
  Mic,
  PenTool,
  LogOut,
  User,
  Download,
  ShieldAlert
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user, isLoaded, isSignedIn } = useUser();
  const { openSignUp } = useClerk();
  const [isClient, setIsClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered successfully.'))
        .catch((err) => console.log('Service Worker registration failed: ', err));
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Triple click logic -> routes to /admin
    setLogoClicks((prev) => {
      const newCount = prev + 1;
      if (newCount >= 3) {
        router.push('/admin');
        return 0; // reset
      } else if (newCount === 1) {
        // Only route to home on first click, but wait a bit to see if they click again
        setTimeout(() => {
          setLogoClicks((current) => {
             if (current === 1) {
                router.push('/');
             }
             return 0; // reset after timeout
          });
        }, 400); // 400ms window to click multiple times
      }
      return newCount;
    });
  };

  const handleInstallApp = async () => {
    // Detect iOS to show manual instruction fallback (iOS doesn't support beforeinstallprompt)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      alert("To install this app on your device:\n\nTap the 'Share' icon at the bottom, then scroll down and tap 'Add to Home Screen'.");
      return;
    }

    if (deferredPrompt) {
      // Trigger the native Android/Chrome install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install this app on Android/Chrome:\n\nTap the 3 dots menu at the top right, then tap 'Install app' or 'Add to Home screen'.");
    }
  };

  const navigation = [
    { name: 'Live', href: '/live', icon: Mic },
    { name: 'Chat', href: '/chat', icon: MessageCircleIcon },
    { name: 'Draft', href: '/draftcreation', icon: PenTool },
  ];

  if (!isClient) return null; // Prevent hydration errors with Clerk

  // Hide the floating navigation on specific immersive pages
  if (
    pathname === '/live' ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] px-4 sm:px-6 lg:px-8 pointer-events-none">
      <div className="max-w-7xl mx-auto pointer-events-auto">
        {/* Floating Rounded Navbar */}
        <nav className="bg-white/90 backdrop-blur-md border border-slate-200/50 shadow-[0_8px_30px_rgba(42,108,240,0.12)] rounded-full px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={handleLogoClick}>
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center transform transition-transform active:scale-95">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="ml-2 text-xl font-bold font-heading text-slate-900 tracking-tight select-none">CivicPulse</span>
          </div>

          {/* Center: Desktop Navigation Links */}
          <div className="hidden lg:flex items-center justify-center flex-1 px-8">
            <div className="flex space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (item.href === '/live') dispatch(setCurrentMode('live'));
                      else if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                      else dispatch(setCurrentMode('home'));
                    }}
                    className={`
                      flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                      ${isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md hover:shadow-gray-200'
                      }
                    `}
                  >
                    <Icon size={18} className={`mr-2 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: User / Auth section */}
          <div className="hidden lg:flex items-center space-x-4 flex-shrink-0">
            <Link href="/admin" className="flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors px-2 py-2 rounded-full hover:bg-slate-50">
              <UserRoundCogIcon size={18} className="mr-1.5" /> Admin
            </Link>
            {isLoaded && isSignedIn && (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                {/* User profile button from clerk */}
                <UserButton />
              </div>
            )}
            {isLoaded && !isSignedIn && (
              <div className="flex items-center gap-3">
                <SignInButton mode="modal">
                  <button className="flex items-center text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors px-4 py-2 rounded-full hover:bg-slate-50">
                    <User size={18} className="mr-2" /> Log In
                  </button>
                </SignInButton>
                <NativeStartNow
                  label="Start Free"
                  variant="gradient"
                  onStart={async () => {
                    await new Promise((resolve) => setTimeout(resolve, 1500));
                    openSignUp();
                  }}
                />
              </div>
            )}
          </div>

          {/* Mobile menu button & Install App */}
          <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={handleInstallApp}
                className="p-2 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                title="Install App"
              >
                <Download className="block h-5 w-5" aria-hidden="true" />
              </button>
            <button
              type="button"
              className="p-2 rounded-full text-slate-500 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu (Floats right below the navbar) */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-200">
            <div className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      if (item.href === '/live') dispatch(setCurrentMode('live'));
                      else if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                      else dispatch(setCurrentMode('home'));
                    }}
                    className={`
                            flex items-center px-4 py-3 rounded-2xl text-base font-semibold transition-colors
                            ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md hover:shadow-gray-200'}
                        `}
                  >
                    <Icon size={20} className={`mr-3 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.name}
                  </Link>
                )
              })}

              {/* Admin Dashboard Link (Mobile) */}
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-3 rounded-2xl text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors mt-1"
              >
                <UserRoundCogIcon size={20} className="mr-3 text-slate-400" />
                Admin Dashboard
              </Link>

              {/* Install App Button (PWA) - Always show on mobile menu to support fallback for iOS */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleInstallApp();
                }}
                className="w-full flex items-center justify-center px-4 py-3 rounded-2xl text-base font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 transition-colors mt-2 border border-indigo-100/50"
              >
                <Download size={20} className="mr-3" />
                Install App
              </button>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {isLoaded && isSignedIn && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <UserButton />
                      <div className="text-sm font-bold text-slate-700 truncate">Account Profile</div>
                    </div>
                  </div>
                  <SignOutButton redirectUrl="/">
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex justify-center items-center px-4 py-3 border border-red-200 rounded-2xl text-base font-bold text-red-600 bg-red-50 hover:bg-red-100 shadow-sm transition-colors"
                    >
                      <LogOut size={18} className="mr-2" /> Log Out
                    </button>
                  </SignOutButton>
                </div>
              )}
              {isLoaded && !isSignedIn && (
                <div className="flex flex-col gap-3">
                  <SignInButton mode="modal">
                    <button className="w-full flex justify-center items-center px-4 py-3 border border-slate-300 rounded-2xl text-base font-bold text-slate-700 bg-white shadow-sm">
                      <User size={18} className="mr-2" /> Log In
                    </button>
                  </SignInButton>
                  <div className="w-full flex justify-center">
                    <NativeStartNow
                      label="Start Free Now"
                      variant="gradient"
                      onStart={async () => {
                        await new Promise((resolve) => setTimeout(resolve, 1500));
                        openSignUp();
                        setMobileMenuOpen(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}