import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';
import React from 'react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth0.getSession();
    if (!session) {
        redirect('/auth/login?returnTo=/admin');
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <nav className="border-b border-gray-800 p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold text-blue-400">CivicPulse Admin</h1>
                    <div className="flex items-center gap-4">
                        <a href="/auth/logout" className="text-sm text-gray-400 hover:text-white transition">Logout</a>
                    </div>
                </div>
            </nav>
            <main className="container mx-auto p-8">
                {children}
            </main>
        </div>
    );
}
