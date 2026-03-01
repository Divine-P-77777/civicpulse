import React from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', color: 'white' }}>
            <nav style={{ borderBottom: '1px solid #374151', padding: '1rem' }}>
                <h1 style={{ color: '#60a5fa', fontSize: '1.25rem', fontWeight: 'bold' }}>CivicPulse Admin</h1>
            </nav>
            <main style={{ padding: '2rem' }}>
                {children}
            </main>
        </div>
    );
}
