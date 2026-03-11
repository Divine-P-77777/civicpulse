import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-devanagari' });

export const metadata: Metadata = {
  metadataBase: new URL('https://civicpulse.vercel.app'),
  title: 'CivicPulse - AI Legal Rights Assistant',
  description: 'AI-powered legal rights assistant to help understand complex legal documents and civic rights',
  keywords: ['legal', 'ai', 'assistant', 'civic rights', 'document analysis', 'law'],
  manifest: '/manifest.json',
  icons: {
    icon: '/logo_minimal.png',
    apple: '/icons/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CivicPulse',
  },
  openGraph: {
    type: 'website',
    url: 'https://civicpulse.vercel.app/',
    title: 'CivicPulse - AI Legal Rights Assistant',
    description: 'AI-powered legal rights assistant to help understand complex legal documents and civic rights',
    images: ['https://civicpulse.vercel.app/logo_minimal.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CivicPulse - AI Legal Rights Assistant',
    description: 'AI-powered legal rights assistant to help understand complex legal documents and civic rights',
    images: ['https://civicpulse.vercel.app/logo_minimal.png'],
  },
};

import { Viewport } from 'next';
export const viewport: Viewport = {
  themeColor: '#4f46e5',
};

import LenisProvider from '@/components/LenisProvider';
import OnboardingModal from '@/components/OnboardingModal';
import MobileFooter from '@/components/MobileFooter';
import Navigation from '@/components/Navigation';
import { PerformanceLogger } from '@/components/PerformanceLogger';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              <Navigation />
              <div id="root">{children}</div>
              <OnboardingModal />
              <MobileFooter />
            </LenisProvider>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}