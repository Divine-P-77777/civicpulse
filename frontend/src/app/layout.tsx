'use client';

import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ClerkProvider } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import LenisProvider from '@/components/LenisProvider';
import OnboardingModal from '@/components/OnboardingModal';
import MobileFooter from '@/components/MobileFooter';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { PerformanceLogger } from '@/components/PerformanceLogger';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-devanagari' });

// Client-side layout to handle conditional UI
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isImmersivePage = pathname?.startsWith('/draftcreation') || pathname?.startsWith('/admin') || pathname?.startsWith('/architecture') || pathname?.startsWith('/live') || pathname?.startsWith('/chat');

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apple PWA Meta Tags */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CivicPulse" />
      </head>
      <body className={`${inter.className} ${notoDevanagari.variable} font-sans`} suppressHydrationWarning>
        <ClerkProvider>
          <Providers>
            <LenisProvider>
              <PerformanceLogger />
              <div className="flex flex-col min-h-screen">
                {!isImmersivePage && <Navigation />}
                <main id="root" className="flex-1">{children}</main>
                {!isImmersivePage && <Footer />}
              </div>
              <OnboardingModal />
              {!isImmersivePage && <MobileFooter />}
            </LenisProvider>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}

// Separate Metadata to avoid issues with 'use client'
// Note: Metadata must be in a server component or exported from a layout/page.
// Since we turned this layout into a client component for pathname, we'll
// keep the metadata logic but note that Next.js might require it in a separate file
// if it complains about mixing 'use client' and metadata export.
