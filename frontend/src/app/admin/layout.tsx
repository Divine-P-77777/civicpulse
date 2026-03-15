import React from 'react';

export const metadata = {
    title: 'CivicPulse Admin',
    description: 'Admin interface for CivicPulse',
};



export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            <div className="flex-1">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
