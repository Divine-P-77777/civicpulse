import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'CivicPulse — Understand Your Legal Rights Instantly',
  description: 'CivicPulse empowers you to decode complex legal documents, uncover hidden risks, and understand your rights—powered by trusted, verified legal AI.',
  keywords: ['legal', 'AI', 'rights', 'document analysis', 'law-verified', 'secure'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
