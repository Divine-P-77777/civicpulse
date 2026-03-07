import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-noto-devanagari' });

export const metadata: Metadata = {
  title: 'CivicPulse - AI Legal Rights Assistant',
  description: 'AI-powered legal rights assistant to help understand complex legal documents and civic rights',
  keywords: ['legal', 'ai', 'assistant', 'civic rights', 'document analysis'],
};

import LenisProvider from '@/components/LenisProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${notoDevanagari.variable} font-sans`} suppressHydrationWarning>
        <ClerkProvider>
          <Providers>
            <LenisProvider>
              <div id="root">{children}</div>
            </LenisProvider>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}