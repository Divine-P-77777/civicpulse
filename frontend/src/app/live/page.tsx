'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LiveMode from './components/LiveMode';

export default function LivePage() {
  const router = useRouter();

  const handleClose = () => {
    // Navigate back to the chat view
    router.push('/chat');
  };

  const handleUploadClick = () => {
    // We will wire this up later to trigger document upload
    alert("Document upload dialog will open here.");
  };

  return (
    <main className="min-h-screen bg-zinc-50 overflow-hidden">
      <LiveMode onClose={handleClose} onUploadClick={handleUploadClick} />
    </main>
  );
}