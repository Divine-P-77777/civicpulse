'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { toggleSidebar, setCurrentMode } from '@/store/slices/uiSlice';
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { 
  Menu, 
  X, 
  Home, 
  MessageCircle, 
  Mic, 
  FileText, 
  Settings, 
  LogOut,
  User
} from 'lucide-react';

export default function Navigation() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { user, isLoaded, isSignedIn } = useUser();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Live Mode', href: '/live', icon: Mic },
    { name: 'Chat Mode', href: '/chat', icon: MessageCircle },
    { name: 'Documents', href: '/documents', icon: FileText },
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="bg-white p-2 rounded-lg shadow-lg"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              CivicPulse
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={() => {
                    dispatch(toggleSidebar());
                    if (item.href === '/live') dispatch(setCurrentMode('live'));
                    else if (item.href === '/chat') dispatch(setCurrentMode('chat'));
                    else dispatch(setCurrentMode('home'));
                  }}
                >
                  <Icon size={20} className="mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t px-4 py-4">
            <SignedIn>
              <div className="space-y-2">
                <div className="flex items-center px-4 py-2">
                  <UserButton afterSignOutUrl="/" />
                  <div className="flex-1 min-w-0 ml-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {isLoaded && isSignedIn ? user.fullName || user.primaryEmailAddress?.emailAddress : 'Loading...'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {isLoaded && isSignedIn ? user.primaryEmailAddress?.emailAddress : ''}
                    </p>
                  </div>
                </div>
                
                <Link
                  href="/settings"
                  className="flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <Settings size={20} className="mr-3" />
                  Settings
                </Link>
              </div>
            </SignedIn>
            <SignedOut>
              <div className="space-y-2">
                <SignInButton mode="modal">
                  <button className="block w-full px-4 py-2 text-sm text-center text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="block w-full px-4 py-2 text-sm text-center text-primary-600 border border-primary-600 hover:bg-primary-50 rounded-lg">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}
    </>
  );
}