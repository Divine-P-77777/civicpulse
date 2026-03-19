'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LiveMode from './components/LiveMode';

export default function LivePage() {
  const router = useRouter();

  const handleClose = () => {
    // Navigate back to the home page
    router.push('/');
  };

  const handleUploadClick = () => {
    // Handled internally by LiveMode
  };

  return (
    <main className="min-h-screen bg-zinc-50 overflow-hidden">
      <LiveMode onClose={handleClose} onUploadClick={handleUploadClick} />
    </main>
  );
}
