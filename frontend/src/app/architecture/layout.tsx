import React from 'react';

export const metadata = {
    title: 'CivicPulse Architecture',
    description: 'Architecture interface for CivicPulse',
};



export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
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
