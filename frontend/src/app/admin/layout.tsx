import React from 'react';

export const metadata = {
    title: 'CivicPulse Admin',
    description: 'Admin interface for CivicPulse',
};



export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
